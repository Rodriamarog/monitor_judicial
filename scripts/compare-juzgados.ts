/**
 * Compare Juzgados - Simple Comparison
 *
 * Compares juzgados from recent bulletins (last 7 days) against historical bulletins (7-30 days ago)
 * to find:
 * 1. NEW juzgados (appeared in last 7 days but NOT in previous 30 days)
 * 2. OBSOLETE juzgados (appeared in 7-30 days ago but NOT in last 7 days)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function compareJuzgados() {
  console.log('🔍 Comparing Juzgados\n');

  const { createClient } = await import('@supabase/supabase-js');
  const { Resend } = await import('resend');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Calculate date ranges
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const todayStr = today.toISOString().split('T')[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  console.log(`Comparing:\n- Recent period: ${sevenDaysAgoStr} to ${todayStr}\n- Historical period: ${thirtyDaysAgoStr} to ${sevenDaysAgoStr}\n`);

  // Get juzgados from recent bulletins (last 7 days)
  const { data: recentBulletins, error: recentError } = await supabase
    .from('bulletin_entries')
    .select('juzgado')
    .not('juzgado', 'like', '%TEST%')
    .not('juzgado', 'like', '%WEBAPP%')
    .gte('bulletin_date', sevenDaysAgoStr)
    .lte('bulletin_date', todayStr);

  if (recentError) throw recentError;

  // Get juzgados from historical bulletins (7-30 days ago)
  const { data: historicalBulletins, error: historicalError } = await supabase
    .from('bulletin_entries')
    .select('juzgado')
    .not('juzgado', 'like', '%TEST%')
    .not('juzgado', 'like', '%WEBAPP%')
    .gte('bulletin_date', thirtyDaysAgoStr)
    .lt('bulletin_date', sevenDaysAgoStr);

  if (historicalError) throw historicalError;

  // Extract unique juzgados from recent bulletins
  const recentJuzgados = new Set<string>();
  for (const entry of recentBulletins || []) {
    recentJuzgados.add(entry.juzgado);
  }

  // Extract unique juzgados from historical bulletins
  const historicalJuzgados = new Set<string>();
  for (const entry of historicalBulletins || []) {
    historicalJuzgados.add(entry.juzgado);
  }

  console.log(`✓ Found ${recentJuzgados.size} unique juzgados in recent bulletins (last 7 days)`);
  console.log(`✓ Found ${historicalJuzgados.size} unique juzgados in historical bulletins (7-30 days ago)\n`);

  // Find NEW juzgados (in recent but NOT in historical)
  const newJuzgados: string[] = [];
  for (const juzgado of recentJuzgados) {
    if (!historicalJuzgados.has(juzgado)) {
      newJuzgados.push(juzgado);
    }
  }

  // Find OBSOLETE juzgados (in historical but NOT in recent)
  const obsoleteJuzgados: string[] = [];
  for (const juzgado of historicalJuzgados) {
    if (!recentJuzgados.has(juzgado)) {
      obsoleteJuzgados.push(juzgado);
    }
  }

  // Display results
  console.log('═'.repeat(60));
  console.log('COMPARISON RESULTS');
  console.log('═'.repeat(60));

  if (newJuzgados.length > 0) {
    console.log(`\n🆕 NEW JUZGADOS (${newJuzgados.length}) - In bulletin but NOT in system:`);
    console.log('─'.repeat(60));
    newJuzgados.forEach(j => console.log(`  - ${j}`));
  } else {
    console.log('\n✓ No new juzgados detected');
  }

  if (obsoleteJuzgados.length > 0) {
    console.log(`\n⚠️  OBSOLETE JUZGADOS (${obsoleteJuzgados.length}) - In system but NOT in bulletin:`);
    console.log('─'.repeat(60));
    obsoleteJuzgados.forEach(j => console.log(`  - ${j}`));
    console.log('\nNote: These might not be obsolete - they may just not have cases today.');
  } else {
    console.log('\n✓ No obsolete juzgados detected');
  }

  console.log('\n' + '═'.repeat(60));

  // Send email if any changes detected
  if (newJuzgados.length > 0 || obsoleteJuzgados.length > 0) {
    const emailHtml = `
      <h2>⚠️ Juzgados Comparison Report</h2>
      <p>Comparison between latest bulletin and system juzgados:</p>

      ${newJuzgados.length > 0 ? `
        <h3>🆕 NEW Juzgados (${newJuzgados.length})</h3>
        <p><strong>These appeared in the bulletin but are NOT in our system:</strong></p>
        <ul>
          ${newJuzgados.map(j => `<li style="background-color: #ffffcc; padding: 5px;">${j}</li>`).join('')}
        </ul>
        <p><strong>Action:</strong> These are likely new juzgados or renamed ones. Add them to the system.</p>
      ` : '<p>✓ No new juzgados detected</p>'}

      ${obsoleteJuzgados.length > 0 ? `
        <h3>⚠️ OBSOLETE Juzgados (${obsoleteJuzgados.length})</h3>
        <p><strong>These are in our system but did NOT appear in today's bulletin:</strong></p>
        <ul>
          ${obsoleteJuzgados.map(j => `<li>${j}</li>`).join('')}
        </ul>
        <p><em>Note: These might not be obsolete - they may just not have cases today. Ignore if they're valid juzgados.</em></p>
      ` : '<p>✓ No obsolete juzgados detected</p>'}

      <hr>
      <p><em>This is an automated report from Monitor Judicial</em></p>
    `;

    try {
      await resend.emails.send({
        from: 'Monitor Judicial <onboarding@resend.dev>',
        to: 'rodriamarog@gmail.com',
        subject: `⚠️ Juzgados Comparison: ${newJuzgados.length} New, ${obsoleteJuzgados.length} Obsolete`,
        html: emailHtml,
      });

      console.log('\n✓ Email sent to rodriamarog@gmail.com');
    } catch (error) {
      console.error('\n✗ Failed to send email:', error);
    }
  } else {
    console.log('\n✓ No changes detected - all juzgados match');
  }
}

compareJuzgados().catch(console.error);
