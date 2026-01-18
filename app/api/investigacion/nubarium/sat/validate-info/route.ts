import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rfc, nombre, cp } = body;

        if (!rfc || !nombre || !cp) {
            return NextResponse.json(
                { error: 'rfc, nombre, and cp are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://sat.nubarium.com/sat/v1/valida_sat_info',
            { rfc, nombre, cp }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SAT Validate Info API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
