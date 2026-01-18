import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { nombre, primerApellido, segundoApellido, fechaNacimiento, entidad, sexo } = body;

        if (!nombre || !primerApellido || !fechaNacimiento || !entidad || !sexo) {
            return NextResponse.json(
                { error: 'Todos los campos obligatorios son requeridos' },
                { status: 400 }
            );
        }

        console.log('[CURP Generate] Generating CURP for:', { nombre, primerApellido, segundoApellido });

        const result = await nubariumClient.post(
            'https://curp.nubarium.com/renapo/obtener_curp',
            {
                nombre,
                primerApellido,
                segundoApellido,
                fechaNacimiento,
                entidad,
                sexo
            }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[CURP Generate] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
