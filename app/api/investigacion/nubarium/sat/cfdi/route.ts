import { NextRequest, NextResponse } from 'next/server';
import { nubariumClient } from '@/lib/nubarium-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { folioCfdi, rfcEmisor, rfcReceptor } = body;

        if (!folioCfdi || !rfcEmisor || !rfcReceptor) {
            return NextResponse.json(
                { error: 'folioCfdi, rfcEmisor, and rfcReceptor are required' },
                { status: 400 }
            );
        }

        const result = await nubariumClient.post(
            'https://api.nubarium.com/sat/valida_cfdi',
            { folioCfdi, rfcEmisor, rfcReceptor }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SAT CFDI API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
