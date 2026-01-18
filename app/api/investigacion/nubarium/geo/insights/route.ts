import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lat, lng, address } = body;

        if (!address && (!lat || !lng)) {
            return NextResponse.json(
                { error: 'Se requiere dirección o coordenadas (lat, lng)' },
                { status: 400 }
            );
        }

        console.log('[Geo Insights] Querying for:', { lat, lng, address });

        const requestBody: any = {};
        if (address) {
            requestBody.address = address;
        } else {
            requestBody.lat = lat;
            requestBody.lng = lng;
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/mex/geo/v1/insights',
            requestBody
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Geo Insights API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
