/**
 * Resend failed WhatsApp alerts by alert ID.
 * Queries all data fresh from Supabase — no hardcoded user/expediente mappings.
 *
 * Usage:
 *   npx tsx scripts/resend-failed-whatsapp.ts
 *
 * Add --send flag to actually send (dry-run by default):
 *   npx tsx scripts/resend-failed-whatsapp.ts --send
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { sendTribunalElectronicoAlert, formatToWhatsApp } from '../lib/whatsapp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// The specific alert IDs to resend
const ALERT_IDS = [
  '5e641438-8eb5-440f-b044-2657aa256b6b', // licbc86 - 00819/2025
  '60fc90b8-3474-4cab-b057-0acdc21827a3', // licbc86 - 01980/2024
  '7099fcb7-de5e-4fe3-8713-6d008d81af3d', // victoriajaimes199 - 00823/2025
];

const DRY_RUN = !process.argv.includes('--send');

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — pass --send to actually send\n' : '🚀 LIVE SEND\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch all alert data in one query, joining through to user phone and case details
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select(`
      id,
      user_id,
      matched_value,
      whatsapp_sent,
      case_file_id,
      monitored_case_id,
      user_profiles!inner (
        email,
        phone,
        whatsapp_enabled
      ),
      case_files (
        ai_summary,
        tribunal_descripcion,
        case_id
      )
    `)
    .in('id', ALERT_IDS);

  if (error || !alerts) {
    console.error('Failed to fetch alerts:', error);
    process.exit(1);
  }

  if (alerts.length !== ALERT_IDS.length) {
    const found = alerts.map(a => a.id);
    const missing = ALERT_IDS.filter(id => !found.includes(id));
    console.error(`⚠ Only found ${alerts.length}/${ALERT_IDS.length} alerts. Missing:`, missing);
  }

  // Fetch juzgado for each monitored_case_id
  const caseIds = [...new Set(alerts.map(a => a.monitored_case_id).filter(Boolean))];
  const { data: cases } = await supabase
    .from('monitored_cases')
    .select('id, juzgado')
    .in('id', caseIds);

  const juzgadoMap = Object.fromEntries((cases || []).map(c => [c.id, c.juzgado]));

  // Process each alert
  for (const alert of alerts) {
    const profile = alert.user_profiles as { email: string; phone: string; whatsapp_enabled: boolean };
    const caseFile = alert.case_files as { ai_summary: string | null; tribunal_descripcion: string; case_id: string } | null;
    const juzgado = juzgadoMap[alert.monitored_case_id] ?? 'JUZGADO DESCONOCIDO';

    console.log(`\n─── Alert ${alert.id} ───`);
    console.log(`  User:        ${profile.email}`);
    console.log(`  Expediente:  ${alert.matched_value}`);
    console.log(`  Juzgado:     ${juzgado}`);
    console.log(`  Phone:       ${profile.phone}`);
    console.log(`  WA enabled:  ${profile.whatsapp_enabled}`);
    console.log(`  Already sent: ${alert.whatsapp_sent}`);

    // Safety checks
    if (alert.whatsapp_sent) {
      console.log('  ⏭  Skipping — already marked as sent');
      continue;
    }

    if (!profile.whatsapp_enabled) {
      console.log('  ⏭  Skipping — WhatsApp disabled for this user');
      continue;
    }

    if (!profile.phone) {
      console.log('  ⏭  Skipping — no phone number');
      continue;
    }

    const whatsappNumber = formatToWhatsApp(profile.phone);
    const summary = caseFile?.ai_summary || caseFile?.tribunal_descripcion || 'Sin descripción';

    console.log(`  To:          ${whatsappNumber}`);
    console.log(`  Summary:     ${summary.substring(0, 80)}...`);

    if (DRY_RUN) {
      console.log('  ✅ Would send (dry run)');
      continue;
    }

    // Send the WhatsApp alert
    const result = await sendTribunalElectronicoAlert({
      to: whatsappNumber,
      expediente: alert.matched_value,
      juzgado,
      fecha: summary,
    });

    if (result.success) {
      console.log(`  ✅ Sent! SID: ${result.messageId}`);

      // Update the alert record
      const { error: updateError } = await supabase
        .from('alerts')
        .update({
          whatsapp_sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', alert.id);

      if (updateError) {
        console.error(`  ⚠ Sent but failed to update DB:`, updateError.message);
      } else {
        console.log('  ✅ DB updated');
      }
    } else {
      console.error(`  ❌ Failed: ${result.error}`);
    }
  }

  console.log('\n─── Done ───');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
