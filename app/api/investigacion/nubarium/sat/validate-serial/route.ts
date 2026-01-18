import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rfc, serial } = body;

        if (!rfc || !serial) {
            return NextResponse.json(
                { error: 'rfc and serial are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/sat/v1/validar-serial',
            { rfc, serial }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SAT Validate Serial API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
