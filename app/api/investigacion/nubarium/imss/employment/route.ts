import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { curp, nss, url } = body;

        if (!curp || !nss || !url) {
            return NextResponse.json(
                { error: 'curp, nss, and url (webhook) are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/mex/ss/v1/employment-info-imss',
            { curp, nss, url }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[IMSS Employment API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
