/**
 * Test WhatsApp Endpoint
 *
 * Allows testing WhatsApp integration before going live
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppAlert } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Missing "to" field (WhatsApp number)' },
        { status: 400 }
      );
    }

    // If custom message provided, send it; otherwise send test alert
    if (message) {
      // Simple test message
      const result = await sendWhatsAppAlert({
        to,
        bulletinDate: new Date().toISOString().split('T')[0],
        alerts: [{
          caseNumber: '00001/2025',
          juzgado: 'JUZGADO DE PRUEBA',
          caseName: 'Mensaje de Prueba',
          rawText: message,
        }],
      });

      return NextResponse.json(result);
    } else {
      // Default test alert
      const result = await sendWhatsAppAlert({
        to,
        userName: 'Usuario de Prueba',
        bulletinDate: new Date().toISOString().split('T')[0],
        alerts: [
          {
            caseNumber: '00123/2024',
            juzgado: 'JUZGADO CUARTO CIVIL DE TIJUANA',
            caseName: 'Caso de Prueba #1',
            rawText: 'Este es un mensaje de prueba del sistema Monitor Judicial. Si recibe este mensaje, la integración de WhatsApp está funcionando correctamente.',
          },
          {
            caseNumber: '00456/2024',
            juzgado: 'JUZGADO SEGUNDO FAMILIAR DE MEXICALI',
            rawText: 'Segundo caso de prueba para verificar formato de múltiples alertas.',
          },
        ],
      });

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Test WhatsApp error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
