import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendNewJuzgadosAlert } from '@/lib/admin-email';
import { sendNewJuzgadoAdminAlert } from '@/lib/whatsapp';

/**
 * Daily New Juzgados Detection Cron Job
 *
 * Runs once per day (3 AM UTC) to detect new juzgados appearing in bulletin_entries
 * that are not yet in the juzgados source of truth table.
 *
 * When new juzgados are found:
 * - Sends detailed email to admin with all detected juzgados
 * - Sends WhatsApp alert to admin
 * - Logs the detection for audit trail
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const results = {
      newJuzgadosFound: 0,
      emailSent: false,
      whatsappSent: false,
      errors: [] as string[],
    };

    console.log('🔍 Checking for new juzgados in bulletin_entries...');

    // Query for juzgados in bulletin_entries that don't exist in juzgados table
    // Apply same filtering logic used in table cleanup to avoid trash data
    const { data: newJuzgados, error: queryError } = await supabase.rpc(
      'find_new_juzgados'
    );

    if (queryError) {
      console.error('Error querying for new juzgados:', queryError);
      results.errors.push(`Query failed: ${queryError.message}`);

      return NextResponse.json({
        success: false,
        error: queryError.message,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    // Check if any new juzgados were found
    if (!newJuzgados || newJuzgados.length === 0) {
      console.log('✅ No new juzgados detected');

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          newJuzgadosFound: 0,
          emailSent: false,
          whatsappSent: false,
          message: 'No new juzgados detected',
        },
      });
    }

    results.newJuzgadosFound = newJuzgados.length;
    console.log(`⚠️ Found ${newJuzgados.length} new juzgado(s)`);

    const adminEmail = 'rodriamarog@gmail.com';
    const adminWhatsApp = 'whatsapp:+16197612314';
    const detectionDate = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Tijuana',
    });

    // ==========================================
    // TASK 1: Send Email Notification
    // ==========================================
    console.log('📧 Sending email notification...');

    try {
      const emailResult = await sendNewJuzgadosAlert({
        adminEmail,
        juzgados: newJuzgados,
        detectionDate,
      });

      if (emailResult.success) {
        results.emailSent = true;
        console.log('✅ Email sent successfully');
      } else {
        results.errors.push(`Email failed: ${emailResult.error}`);
        console.error('❌ Email send failed:', emailResult.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`Email error: ${errorMsg}`);
      console.error('❌ Email error:', error);
    }

    // ==========================================
    // TASK 2: Send WhatsApp Notification
    // ==========================================
    console.log('📱 Sending WhatsApp notification...');

    try {
      const whatsappResult = await sendNewJuzgadoAdminAlert({
        to: adminWhatsApp,
        count: newJuzgados.length,
        firstJuzgado: newJuzgados[0].name,
        detectionDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      });

      if (whatsappResult.success) {
        results.whatsappSent = true;
        console.log('✅ WhatsApp sent successfully, SID:', whatsappResult.messageId);
      } else {
        results.errors.push(`WhatsApp failed: ${whatsappResult.error}`);
        console.error('❌ WhatsApp send failed:', whatsappResult.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`WhatsApp error: ${errorMsg}`);
      console.error('❌ WhatsApp error:', error);
    }

    // ==========================================
    // Return Summary
    // ==========================================
    console.log('✅ New juzgados check completed:', results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        newJuzgadosFound: results.newJuzgadosFound,
        juzgados: newJuzgados.map(j => j.name),
        emailSent: results.emailSent,
        whatsappSent: results.whatsappSent,
        totalErrors: results.errors.length,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Fatal error in new juzgados check cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute timeout for cron job
