import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { documento, rfc, cif, tipo } = body;

        const result = await nubariumClient.post(
            'https://api.nubarium.com/sat/v1/consultar_cif',
            { documento, rfc, cif, tipo }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SAT CSF/CIF API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
