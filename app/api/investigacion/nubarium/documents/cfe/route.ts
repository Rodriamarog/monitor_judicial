import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, serviceNumber } = body;

        if (!name || !serviceNumber) {
            return NextResponse.json(
                { error: 'name and serviceNumber are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/mex/documents/validate-cfe',
            { name, serviceNumber }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[CFE Validation API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
