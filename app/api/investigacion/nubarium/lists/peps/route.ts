import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nombreCompleto, similitud } = body;

        if (!nombreCompleto) {
            return NextResponse.json(
                { error: 'nombreCompleto is required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/blacklists/v1/consulta',
            { nombreCompleto, similitud: similitud || 80 }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[PEPs API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
