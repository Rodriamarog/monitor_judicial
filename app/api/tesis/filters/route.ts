import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres/tesis-db';

/**
 * GET /api/tesis/filters
 * Returns all unique filter values for tesis search
 */
export async function GET() {
  try {
    // Get all unique materias with counts
    const materiasResult = await query(`
      WITH expanded_materias AS (
        SELECT unnest(materias) as materia
        FROM tesis_documents
        WHERE materias IS NOT NULL
      )
      SELECT
        materia,
        COUNT(*) as count
      FROM expanded_materias
      WHERE materia != '' AND materia IS NOT NULL
      GROUP BY materia
      ORDER BY count DESC, materia ASC
    `);

    // Get all unique tipos de tesis
    const tiposResult = await query(`
      SELECT DISTINCT tipo_tesis as tipo, COUNT(*) as count
      FROM tesis_documents
      WHERE tipo_tesis IS NOT NULL AND tipo_tesis != ''
      GROUP BY tipo_tesis
      ORDER BY count DESC, tipo_tesis ASC
    `);

    // Get all unique épocas
    const epocasResult = await query(`
      SELECT DISTINCT epoca, COUNT(*) as count
      FROM tesis_documents
      WHERE epoca IS NOT NULL AND epoca != ''
      GROUP BY epoca
      ORDER BY epoca DESC
    `);

    // Get all unique instancias
    const instanciasResult = await query(`
      SELECT DISTINCT instancia, COUNT(*) as count
      FROM tesis_documents
      WHERE instancia IS NOT NULL AND instancia != ''
      GROUP BY instancia
      ORDER BY count DESC, instancia ASC
    `);

    // Get year range
    const yearsResult = await query(`
      SELECT MIN(anio) as min_year, MAX(anio) as max_year
      FROM tesis_documents
      WHERE anio IS NOT NULL
    `);

    // Get document count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM tesis_documents
    `);

    return NextResponse.json({
      materias: materiasResult.rows,
      tipos: tiposResult.rows,
      epocas: epocasResult.rows,
      instancias: instanciasResult.rows,
      yearRange: yearsResult.rows[0] || { min_year: null, max_year: null },
      totalDocuments: parseInt(countResult.rows[0]?.total || '0'),
    });
  } catch (error) {
    console.error('Error fetching tesis filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
