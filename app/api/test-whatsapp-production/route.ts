/**
 * Production WhatsApp Test API Route
 * Tests WhatsApp sending in the actual Vercel production environment
 *
 * Call this endpoint to test if WhatsApp works in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppAlert, formatToWhatsApp } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Simple auth - require a secret
  const authHeader = request.headers.get('authorization');
  const testSecret = process.env.CRON_SECRET; // Reuse cron secret for simplicity

  if (authHeader !== `Bearer ${testSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const phoneNumber = body.phone || '+526641887153'; // Default to the user who had the issue

    console.log('🧪 Production WhatsApp Test');
    console.log('Environment check:');
    console.log('- TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
    console.log('- TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
    console.log('- TWILIO_WHATSAPP_FROM:', process.env.TWILIO_WHATSAPP_FROM || 'NOT SET');
    console.log('- TWILIO_WHATSAPP_ALERT_TEMPLATE_SID:', process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID || 'NOT SET');

    const whatsappNumber = formatToWhatsApp(phoneNumber);
    console.log('Formatted WhatsApp number:', whatsappNumber);

    const result = await sendWhatsAppAlert({
      to: whatsappNumber,
      userName: 'Test User',
      bulletinDate: new Date().toISOString().split('T')[0],
      alerts: [{
        caseNumber: 'TEST-001/2025',
        juzgado: 'JUZGADO DE PRUEBA (PRODUCTION TEST)',
        caseName: 'Test Case',
        rawText: 'Esta es una prueba de WhatsApp desde producción de Vercel.',
      }],
    });

    console.log('WhatsApp send result:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp sent successfully from production',
        messageId: result.messageId,
        phone: phoneNumber,
        environment: {
          twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
          twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
          twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'NOT SET',
          twilioTemplateSid: process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID || 'NOT SET',
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        phone: phoneNumber,
        environment: {
          twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
          twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
          twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'NOT SET',
          twilioTemplateSid: process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID || 'NOT SET',
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Production WhatsApp test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      environment: {
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
        twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'NOT SET',
        twilioTemplateSid: process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID || 'NOT SET',
      }
    }, { status: 500 });
  }
}
