import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { curp, url } = body;

        if (!curp || !url) {
            return NextResponse.json(
                { error: 'curp and url (webhook) are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/imss/wh/v1/obtener_nss',
            { curp, url }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[IMSS NSS API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
