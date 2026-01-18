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
        const { vin, nic, placa, pdf = false } = body;

        if (!vin && !nic && !placa) {
            return NextResponse.json(
                { error: 'Se requiere VIN, NIC o placa' },
                { status: 400 }
            );
        }

        console.log('[REPUVE] Searching for:', { vin, nic, placa });

        const result = await nubariumClient.post(
            'https://api.nubarium.com/mex/services/v1/validate-repuve',
            {
                ...(vin && { vin }),
                ...(nic && { nic }),
                ...(placa && { placa }),
                pdf
            }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[REPUVE] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
