import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rfc } = body;

        if (!rfc) {
            return NextResponse.json(
                { error: 'rfc is required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/sat/consultar_69',
            { rfc }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SAT 69 API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
