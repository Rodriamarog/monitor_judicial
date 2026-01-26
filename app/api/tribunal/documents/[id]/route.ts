/**
 * Tribunal Electrónico Document API Route
 * PATCH - Mark document as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Update read_at timestamp (RLS enforces user_id)
    const { error: updateError } = await supabase
      .from('tribunal_documents')
      .update({ read_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Document Update] Error:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar documento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Documento marcado como leído'
    });

  } catch (error) {
    console.error('[Document Update] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
