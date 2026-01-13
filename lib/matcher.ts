/**
 * Bulletin Matcher
 *
 * Finds matches between bulletin entries and monitored cases,
 * creates alerts for users
 */

import { createClient } from '@supabase/supabase-js';

interface BulletinEntry {
  id: string;
  bulletin_date: string;
  juzgado: string;
  case_number: string;
  raw_text: string;
  source: string;
}

interface MonitoredCase {
  id: string;
  user_id: string;
  case_number: string;
  juzgado: string;
  nombre: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  whatsapp_enabled: boolean;
}

interface MatchResult {
  total_new_entries: number;
  total_monitored_cases: number;
  matches_found: number;
  alerts_created: number;
  details: Array<{
    case_number: string;
    juzgado: string;
    user_email: string;
  }>;
}

/**
 * Find matches between new bulletin entries and monitored cases
 * Creates alert records for each match
 */
export async function findAndCreateMatches(
  bulletinDate: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<MatchResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const result: MatchResult = {
    total_new_entries: 0,
    total_monitored_cases: 0,
    matches_found: 0,
    alerts_created: 0,
    details: [],
  };

  // Load juzgado aliases for name resolution
  const { data: aliases, error: aliasError } = await supabase
    .from('juzgado_aliases')
    .select('alias, canonical_name');

  if (aliasError) {
    console.error('Error loading juzgado aliases:', aliasError);
  }

  // Create alias lookup map
  const aliasMap = new Map<string, string>();
  if (aliases) {
    for (const { alias, canonical_name } of aliases) {
      aliasMap.set(alias, canonical_name);
    }
    console.log(`Loaded ${aliasMap.size} juzgado aliases for matching`);
  }

  // Get all bulletin entries for this date
  // Note: Supabase has a default 1000 row limit, so we need to fetch all pages
  let bulletinEntries: BulletinEntry[] = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore) {
    const { data, error: entriesError } = await supabase
      .from('bulletin_entries')
      .select('id, bulletin_date, juzgado, case_number, raw_text, source')
      .eq('bulletin_date', bulletinDate)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (entriesError) {
      console.error('Error fetching bulletin entries:', entriesError);
      throw entriesError;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      bulletinEntries.push(...(data as BulletinEntry[]));
      hasMore = data.length === pageSize;
      page++;
    }
  }

  if (!bulletinEntries || bulletinEntries.length === 0) {
    console.log('No bulletin entries found for', bulletinDate);
    return result;
  }

  result.total_new_entries = bulletinEntries.length;
  console.log(`Found ${bulletinEntries.length} bulletin entries for ${bulletinDate}`);

  // Get all monitored cases with user info
  const { data: monitoredCases, error: casesError } = await supabase
    .from('monitored_cases')
    .select(`
      id,
      user_id,
      case_number,
      juzgado,
      nombre,
      user_profiles (
        id,
        email,
        phone
      )
    `);

  if (casesError) {
    console.error('Error fetching monitored cases:', casesError);
    throw casesError;
  }

  if (!monitoredCases || monitoredCases.length === 0) {
    console.log('No monitored cases found');
    return result;
  }

  result.total_monitored_cases = monitoredCases.length;
  console.log(`Found ${monitoredCases.length} monitored cases`);

  // Create a map for fast lookups: "case_number|juzgado" -> monitored cases
  const monitoredCasesMap = new Map<string, Array<typeof monitoredCases[0]>>();
  for (const monitoredCase of monitoredCases) {
    const key = `${monitoredCase.case_number}|${monitoredCase.juzgado}`;
    if (!monitoredCasesMap.has(key)) {
      monitoredCasesMap.set(key, []);
    }
    monitoredCasesMap.get(key)!.push(monitoredCase);
  }

  // Find matches
  const alertsToCreate: Array<{
    user_id: string;
    monitored_case_id: string;
    bulletin_entry_id: string;
    matched_on: string;
    matched_value: string;
  }> = [];

  for (const entry of bulletinEntries) {
    // Resolve alias to canonical name if it exists
    const resolvedJuzgado = aliasMap.get(entry.juzgado) || entry.juzgado;

    const key = `${entry.case_number}|${resolvedJuzgado}`;
    const matches = monitoredCasesMap.get(key);

    if (matches && matches.length > 0) {
      console.log(`  ✓ Match found: ${entry.case_number} at ${entry.juzgado}`);
      result.matches_found++;

      for (const monitoredCase of matches) {
        const userProfile = monitoredCase.user_profiles as unknown as UserProfile;

        alertsToCreate.push({
          user_id: monitoredCase.user_id,
          monitored_case_id: monitoredCase.id,
          bulletin_entry_id: entry.id,
          matched_on: 'case_number',
          matched_value: entry.case_number,
        });

        result.details.push({
          case_number: entry.case_number,
          juzgado: entry.juzgado,
          user_email: userProfile?.email || 'unknown',
        });
      }
    }
  }

  // Insert alerts (using upsert to avoid duplicates)
  if (alertsToCreate.length > 0) {
    const { data: createdAlerts, error: alertsError } = await supabase
      .from('alerts')
      .upsert(alertsToCreate, {
        onConflict: 'user_id,bulletin_entry_id,monitored_case_id',
        ignoreDuplicates: true,
      })
      .select();

    if (alertsError) {
      console.error('Error creating alerts:', alertsError);
      throw alertsError;
    }

    result.alerts_created = createdAlerts?.length || 0;
    console.log(`Created ${result.alerts_created} new alerts`);
  }

  return result;
}

/**
 * Get unsent alerts (for WhatsApp notification sending)
 */
export async function getUnsentAlerts(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select(`
      id,
      user_id,
      matched_value,
      created_at,
      user_profiles (
        email,
        phone,
        full_name,
        whatsapp_enabled,
        email_notifications_enabled
      ),
      monitored_cases (
        case_number,
        juzgado,
        nombre
      ),
      bulletin_entries (
        bulletin_date,
        raw_text,
        bulletin_url
      )
    `)
    .eq('whatsapp_sent', false)
    .order('created_at', { ascending: true })
    .limit(100); // Process in batches of 100

  if (error) {
    console.error('Error fetching unsent alerts:', error);
    throw error;
  }

  return alerts || [];
}

/**
 * Mark alert as sent (both email and WhatsApp)
 */
export async function markAlertAsSent(
  alertId: string,
  emailSuccess: boolean,
  emailError: string | null,
  whatsappSuccess: boolean,
  whatsappError: string | null,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('alerts')
    .update({
      email_sent: emailSuccess,
      email_error: emailError,
      whatsapp_sent: whatsappSuccess,
      whatsapp_error: whatsappError,
      sent_at: (emailSuccess || whatsappSuccess) ? new Date().toISOString() : null,
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error updating alert:', error);
    throw error;
  }
}

/**
 * Check historical bulletins for a specific case (last 90 days)
 * Creates alerts for any matches found
 */
export async function checkHistoricalMatches(
  userId: string,
  monitoredCaseId: string,
  caseNumber: string,
  juzgado: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  matchesFound: number;
  alertsCreated: number;
  matches: Array<{
    bulletin_date: string;
    raw_text: string;
    bulletin_url: string;
  }>;
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Calculate date 90 days ago
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const startDate = ninetyDaysAgo.toISOString().split('T')[0];

  console.log(`Checking historical bulletins for ${caseNumber} in ${juzgado} since ${startDate}`);

  // Search for matching bulletin entries in the last 90 days
  const { data: bulletinEntries, error: searchError } = await supabase
    .from('bulletin_entries')
    .select('id, bulletin_date, raw_text, bulletin_url, source')
    .eq('case_number', caseNumber)
    .eq('juzgado', juzgado)
    .gte('bulletin_date', startDate)
    .order('bulletin_date', { ascending: false });

  if (searchError) {
    console.error('Error searching historical bulletins:', searchError);
    throw searchError;
  }

  const matchesFound = bulletinEntries?.length || 0;

  if (!bulletinEntries || bulletinEntries.length === 0) {
    console.log('No historical matches found');
    return {
      matchesFound: 0,
      alertsCreated: 0,
      matches: [],
    };
  }

  console.log(`Found ${matchesFound} historical matches`);

  // Create alerts for each historical match
  const alertsToCreate = bulletinEntries.map((entry) => ({
    user_id: userId,
    monitored_case_id: monitoredCaseId,
    bulletin_entry_id: entry.id,
    matched_on: 'case_number',
    matched_value: caseNumber,
  }));

  const { data: createdAlerts, error: alertsError } = await supabase
    .from('alerts')
    .upsert(alertsToCreate, {
      onConflict: 'user_id,bulletin_entry_id,monitored_case_id',
      ignoreDuplicates: true,
    })
    .select();

  if (alertsError) {
    console.error('Error creating historical alerts:', alertsError);
    throw alertsError;
  }

  const alertsCreated = createdAlerts?.length || 0;
  console.log(`Created ${alertsCreated} alerts for historical matches`);

  // Return summary
  return {
    matchesFound,
    alertsCreated,
    matches: bulletinEntries.map((entry) => ({
      bulletin_date: entry.bulletin_date,
      raw_text: entry.raw_text,
      bulletin_url: entry.bulletin_url,
    })),
  };
}
