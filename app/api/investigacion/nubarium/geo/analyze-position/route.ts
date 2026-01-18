import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lat, lng } = body;

        if (!lat || !lng) {
            return NextResponse.json(
                { error: 'lat and lng are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'http://api.nubarium.com/mex/geo/v1/analyze-position',
            { lat, lng }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Geo Analyze Position API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
