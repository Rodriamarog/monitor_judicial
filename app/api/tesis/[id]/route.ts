import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres/tesis-db';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/server/get-effective-tier';
import { hasFeature } from '@/lib/subscription-tiers';

/**
 * GET /api/tesis/[id]
 * Get a single tesis by ID with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tier = await getEffectiveTier(supabase, user.id);
    if (!hasFeature(tier, 'hasTesis')) {
      return NextResponse.json(
        { error: 'Tu plan no incluye acceso al Buscador de Tesis.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tesisId = parseInt(id);

    if (isNaN(tesisId)) {
      return NextResponse.json(
        { error: 'Invalid tesis ID' },
        { status: 400 }
      );
    }

    const result = await query(
      `
      SELECT
        id_tesis,
        rubro,
        texto,
        precedentes,
        epoca,
        instancia,
        organo_juris,
        fuente,
        tesis,
        tipo_tesis,
        localizacion,
        anio,
        mes,
        nota_publica,
        anexos,
        materias
      FROM tesis_documents
      WHERE id_tesis = $1
      `,
      [tesisId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tesis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tesis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tesis' },
      { status: 500 }
    );
  }
}
