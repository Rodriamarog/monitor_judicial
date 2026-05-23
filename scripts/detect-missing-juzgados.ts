/**
 * Detect Missing Juzgados
 *
 * Simple script to detect if juzgados that used to appear in bulletins
 * have stopped appearing (likely due to name change).
 *
 * Sends email to admin when a juzgado hasn't appeared in 7+ days.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function detectMissingJuzgados() {
  console.log('🔍 Detecting Missing Juzgados\n');

  const { createClient } = await import('@supabase/supabase-js');
  const { Resend } = await import('resend');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Get all unique juzgados from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: historicalJuzgados, error: histError } = await supabase
    .from('bulletin_entries')
    .select('juzgado, bulletin_date')
    .gte('bulletin_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('bulletin_date', { ascending: false });

  if (histError) throw histError;

  // Group by juzgado and find last seen date
  const juzgadoLastSeen = new Map<string, string>();

  for (const entry of historicalJuzgados || []) {
    if (!juzgadoLastSeen.has(entry.juzgado)) {
      juzgadoLastSeen.set(entry.juzgado, entry.bulletin_date);
    }
  }

  console.log(`Found ${juzgadoLastSeen.size} unique juzgados in last 30 days\n`);

  // Check for juzgados not seen in last 7 days (MISSING)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const missingJuzgados: Array<{ name: string; lastSeen: string; daysMissing: number }> = [];

  for (const [juzgado, lastSeen] of juzgadoLastSeen.entries()) {
    if (lastSeen < sevenDaysAgoStr) {
      const daysMissing = Math.floor(
        (new Date().getTime() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)
      );
      missingJuzgados.push({ name: juzgado, lastSeen, daysMissing });
    }
  }

  // Check for NEW juzgados (appeared in last 7 days for the first time)
  const { data: recentJuzgados, error: recentError } = await supabase
    .from('bulletin_entries')
    .select('juzgado, bulletin_date')
    .gte('bulletin_date', sevenDaysAgoStr)
    .order('bulletin_date', { ascending: false });

  if (recentError) throw recentError;

  const recentUnique = new Set<string>();
  for (const entry of recentJuzgados || []) {
    recentUnique.add(entry.juzgado);
  }

  // Get juzgados from 8-30 days ago (historical baseline)
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  const { data: olderJuzgados, error: olderError } = await supabase
    .from('bulletin_entries')
    .select('juzgado')
    .lt('bulletin_date', sevenDaysAgoStr)
    .gte('bulletin_date', thirtyDaysAgo.toISOString().split('T')[0]);

  if (olderError) throw olderError;

  const historicalUnique = new Set<string>();
  for (const entry of olderJuzgados || []) {
    historicalUnique.add(entry.juzgado);
  }

  // Fetch all known juzgados from the DB to filter out false positives
  const { data: knownJuzgados, error: knownError } = await supabase
    .from('juzgados')
    .select('name, is_active');

  if (knownError) throw knownError;

  const knownActiveNames = new Set<string>();
  const knownInactiveNames = new Set<string>();
  for (const j of knownJuzgados || []) {
    if (j.is_active) knownActiveNames.add(j.name);
    else knownInactiveNames.add(j.name);
  }

  // Find juzgados that appear in recent but NOT in historical AND NOT already in DB
  const newJuzgados: Array<{ name: string; firstSeen: string }> = [];
  for (const juzgado of recentUnique) {
    if (!historicalUnique.has(juzgado) && !knownActiveNames.has(juzgado) && !knownInactiveNames.has(juzgado)) {
      // Find first appearance date
      const firstAppearance = (recentJuzgados || [])
        .filter(e => e.juzgado === juzgado)
        .sort((a, b) => a.bulletin_date.localeCompare(b.bulletin_date))[0];

      newJuzgados.push({
        name: juzgado,
        firstSeen: firstAppearance?.bulletin_date || sevenDaysAgoStr
      });
    }
  }

  // Filter missing juzgados: skip ones already marked inactive in the DB
  const filteredMissingJuzgados = missingJuzgados.filter(j => !knownInactiveNames.has(j.name));

  if (filteredMissingJuzgados.length === 0 && newJuzgados.length === 0) {
    console.log('✓ No missing or new juzgados detected - all normal');
    return;
  }

  // Sort by days missing (most to least)
  filteredMissingJuzgados.sort((a, b) => b.daysMissing - a.daysMissing);

  // Display results
  if (filteredMissingJuzgados.length > 0) {
    console.log(`⚠ Found ${filteredMissingJuzgados.length} MISSING juzgados:\n`);
    filteredMissingJuzgados.forEach(j => {
      console.log(`  - ${j.name}`);
      console.log(`    Last seen: ${j.lastSeen} (${j.daysMissing} days ago)\n`);
    });
  }

  if (newJuzgados.length > 0) {
    console.log(`🆕 Found ${newJuzgados.length} NEW juzgados:\n`);
    newJuzgados.forEach(j => {
      console.log(`  - ${j.name}`);
      console.log(`    First seen: ${j.firstSeen}\n`);
    });
  }

  // Send email notification
  const emailHtml = `
    <h2>⚠️ Juzgado Changes Alert</h2>

    ${filteredMissingJuzgados.length > 0 ? `
      <h3>❌ Missing Juzgados (${filteredMissingJuzgados.length})</h3>
      <p>These juzgados have not appeared in bulletins for 7+ days. They may have been renamed:</p>
      <table border="1" cellpadding="8" style="border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <th>Juzgado</th>
          <th>Last Seen</th>
          <th>Days Missing</th>
        </tr>
        ${filteredMissingJuzgados.map(j => `
          <tr>
            <td>${j.name}</td>
            <td>${j.lastSeen}</td>
            <td>${j.daysMissing} days</td>
          </tr>
        `).join('')}
      </table>
    ` : ''}

    ${newJuzgados.length > 0 ? `
      <h3>🆕 New Juzgados (${newJuzgados.length})</h3>
      <p>These juzgados appeared for the first time in the last 7 days:</p>
      <table border="1" cellpadding="8" style="border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <th>Juzgado</th>
          <th>First Seen</th>
        </tr>
        ${newJuzgados.map(j => `
          <tr>
            <td style="background-color: #ffffcc;">${j.name}</td>
            <td>${j.firstSeen}</td>
          </tr>
        `).join('')}
      </table>
    ` : ''}

    <p><strong>Action Required:</strong></p>
    <ol>
      ${filteredMissingJuzgados.length > 0 ? '<li>Check if missing juzgados were renamed to one of the new names</li>' : ''}
      ${newJuzgados.length > 0 ? '<li>Verify new juzgados are being scraped correctly</li>' : ''}
      <li>Update system if needed</li>
    </ol>
    <br>
    <p><em>This is an automated alert from Monitor Judicial</em></p>
  `;

  try {
    const subject = [
      filteredMissingJuzgados.length > 0 ? `${filteredMissingJuzgados.length} Missing` : '',
      newJuzgados.length > 0 ? `${newJuzgados.length} New` : ''
    ].filter(Boolean).join(', ') + ' Juzgados Detected';

    await resend.emails.send({
      from: 'Monitor Judicial <onboarding@resend.dev>',
      to: 'rodriamarog@gmail.com',
      subject: `⚠️ ${subject}`,
      html: emailHtml,
    });

    console.log('✓ Email notification sent to rodriamarog@gmail.com');
  } catch (error) {
    console.error('✗ Failed to send email:', error);
  }
}

detectMissingJuzgados().catch(console.error);
