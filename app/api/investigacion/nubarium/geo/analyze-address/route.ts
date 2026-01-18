import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json(
                { error: 'address is required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/mex/geo/v1/analyze-address',
            { address }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Geo Analyze Address API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
