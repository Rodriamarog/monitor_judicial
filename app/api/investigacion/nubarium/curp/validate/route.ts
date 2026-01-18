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
        const { curp } = body;

        if (!curp) {
            return NextResponse.json(
                { error: 'CURP es requerido' },
                { status: 400 }
            );
        }

        console.log('[CURP Validate] Validating CURP:', curp);

        const result = await nubariumClient.post(
            'https://curp.nubarium.com/renapo/v3/valida_curp',
            { curp }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[CURP Validate] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
