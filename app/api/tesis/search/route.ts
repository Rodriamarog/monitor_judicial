import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres/tesis-db';

// Month name to number mapping for date comparisons
const MONTH_TO_NUMBER: Record<string, number> = {
  'Enero': 1,
  'Febrero': 2,
  'Marzo': 3,
  'Abril': 4,
  'Mayo': 5,
  'Junio': 6,
  'Julio': 7,
  'Agosto': 8,
  'Septiembre': 9,
  'Octubre': 10,
  'Noviembre': 11,
  'Diciembre': 12,
};

/**
 * GET /api/tesis/search
 * Search tesis with filters and pagination
 *
 * Query parameters:
 * - q: Search query (searches in rubro and texto)
 * - materias: Comma-separated materias filter
 * - tipo: Tipo de tesis filter
 * - epoca: Época filter
 * - instancia: Instancia filter
 * - yearFrom: Start year for date range
 * - monthFrom: Start month for date range
 * - yearTo: End year for date range
 * - monthTo: End month for date range
 * - sort: Sort order (newest or oldest, default: newest)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get query parameters
    const searchQuery = searchParams.get('q') || '';
    const materiasParam = searchParams.get('materias');
    const tipoFilter = searchParams.get('tipo');
    const epocaFilter = searchParams.get('epoca');
    const instanciaFilter = searchParams.get('instancia');
    const yearFrom = searchParams.get('yearFrom');
    const monthFrom = searchParams.get('monthFrom');
    const yearTo = searchParams.get('yearTo');
    const monthTo = searchParams.get('monthTo');
    const sortOrder = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skipCount = searchParams.get('skipCount') === 'true';

    // Parse materias if provided
    const materias = materiasParam ? materiasParam.split(',').map(m => m.trim()) : null;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    const hasTextSearch = searchQuery.trim().length > 0;

    // Materias filter (array overlap)
    if (materias && materias.length > 0) {
      params.push(materias);
      conditions.push(`materias && $${paramIndex}::text[]`);
      paramIndex++;
    }

    // Tipo filter
    if (tipoFilter) {
      params.push(tipoFilter);
      conditions.push(`tipo_tesis = $${paramIndex}`);
      paramIndex++;
    }

    // Época filter
    if (epocaFilter) {
      params.push(epocaFilter);
      conditions.push(`epoca = $${paramIndex}`);
      paramIndex++;
    }

    // Instancia filter
    if (instanciaFilter) {
      params.push(instanciaFilter);
      conditions.push(`instancia = $${paramIndex}`);
      paramIndex++;
    }

    // Date range filter (combined year + month)
    // Build a CASE expression for month-to-number conversion
    const monthCaseExpr = `
      CASE mes
        WHEN 'Enero' THEN 1
        WHEN 'Febrero' THEN 2
        WHEN 'Marzo' THEN 3
        WHEN 'Abril' THEN 4
        WHEN 'Mayo' THEN 5
        WHEN 'Junio' THEN 6
        WHEN 'Julio' THEN 7
        WHEN 'Agosto' THEN 8
        WHEN 'Septiembre' THEN 9
        WHEN 'Octubre' THEN 10
        WHEN 'Noviembre' THEN 11
        WHEN 'Diciembre' THEN 12
        ELSE 0
      END
    `;

    // From date filter: (year > yearFrom) OR (year = yearFrom AND month >= monthFrom)
    if (yearFrom) {
      const yearFromInt = parseInt(yearFrom);
      if (monthFrom && MONTH_TO_NUMBER[monthFrom]) {
        const monthFromNum = MONTH_TO_NUMBER[monthFrom];
        params.push(yearFromInt, yearFromInt, monthFromNum);
        conditions.push(
          `(anio > $${paramIndex} OR (anio = $${paramIndex + 1} AND ${monthCaseExpr} >= $${paramIndex + 2}))`
        );
        paramIndex += 3;
      } else {
        // Only year filter, no month
        params.push(yearFromInt);
        conditions.push(`anio >= $${paramIndex}`);
        paramIndex++;
      }
    }

    // To date filter: (year < yearTo) OR (year = yearTo AND month <= monthTo)
    if (yearTo) {
      const yearToInt = parseInt(yearTo);
      if (monthTo && MONTH_TO_NUMBER[monthTo]) {
        const monthToNum = MONTH_TO_NUMBER[monthTo];
        params.push(yearToInt, yearToInt, monthToNum);
        conditions.push(
          `(anio < $${paramIndex} OR (anio = $${paramIndex + 1} AND ${monthCaseExpr} <= $${paramIndex + 2}))`
        );
        paramIndex += 3;
      } else {
        // Only year filter, no month
        params.push(yearToInt);
        conditions.push(`anio <= $${paramIndex}`);
        paramIndex++;
      }
    }

    // Build filter clause (everything except text search)
    const filterClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Build the main query - use UNION strategy for text search to enable index usage
    let countQuery: string;
    let resultsQuery: string;
    let countParams: any[];
    let resultsParams: any[];

    // Calculate offset
    const offset = (page - 1) * limit;

    // Determine sort order
    const orderByClause = sortOrder === 'oldest'
      ? 'ORDER BY anio ASC, id_tesis ASC'   // Oldest: ascending (2000, 2001, 2002...)
      : 'ORDER BY anio DESC, id_tesis DESC'; // Newest: descending (2024, 2023, 2022...)

    if (hasTextSearch) {
      // Use CTE with UNION to search rubro and texto separately - this allows both indexes to be used
      // and sorts on minimal data before fetching full rows
      const searchPattern = `%${searchQuery}%`;

      countQuery = `
        SELECT COUNT(DISTINCT id_tesis) as total
        FROM (
          SELECT id_tesis FROM tesis_documents
          WHERE public.immutable_unaccent(texto) ILIKE $1 AND ${filterClause}
          UNION
          SELECT id_tesis FROM tesis_documents
          WHERE public.immutable_unaccent(rubro) ILIKE $1 AND ${filterClause}
        ) AS combined
      `;
      countParams = [searchPattern, ...params];

      resultsQuery = `
        WITH texto_matches AS (
          SELECT id_tesis, anio FROM tesis_documents
          WHERE public.immutable_unaccent(texto) ILIKE $1 AND ${filterClause}
        ),
        rubro_matches AS (
          SELECT id_tesis, anio FROM tesis_documents
          WHERE public.immutable_unaccent(rubro) ILIKE $1 AND ${filterClause}
        ),
        combined_sorted AS (
          SELECT id_tesis, anio FROM texto_matches
          UNION
          SELECT id_tesis, anio FROM rubro_matches
          ${orderByClause}
          LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        )
        SELECT
          t.id_tesis,
          t.rubro,
          LEFT(t.texto, 500) as texto_preview,
          t.epoca,
          t.instancia,
          t.tipo_tesis,
          t.anio,
          t.materias,
          t.tesis
        FROM tesis_documents t
        INNER JOIN combined_sorted c ON t.id_tesis = c.id_tesis
        ${orderByClause}
      `;
      resultsParams = [searchPattern, ...params, limit, offset];
    } else {
      // No text search - just use simple WHERE clause
      countQuery = `SELECT COUNT(*) as total FROM tesis_documents WHERE ${filterClause}`;
      countParams = params;

      resultsQuery = `
        SELECT
          id_tesis,
          rubro,
          LEFT(texto, 500) as texto_preview,
          epoca,
          instancia,
          tipo_tesis,
          anio,
          materias,
          tesis
        FROM tesis_documents
        WHERE ${filterClause}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      resultsParams = [...params, limit, offset];
    }

    // Get total count for pagination (skip if already known from previous request)
    let totalCount = 0;
    if (!skipCount) {
      const countResult = await query(countQuery, countParams);
      totalCount = parseInt(countResult.rows[0]?.total || '0');
    }

    // Get results with pagination
    const resultsData = await query(resultsQuery, resultsParams);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      results: resultsData.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error searching tesis:', error);
    return NextResponse.json(
      { error: 'Failed to search tesis' },
      { status: 500 }
    );
  }
}
