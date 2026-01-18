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
            'https://sat.nubarium.com/sat/v1/obtener-razonsocial',
            { rfc }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SAT Get Name API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
