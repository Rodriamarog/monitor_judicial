/**
 * Bulletin Matcher
 *
 * Finds matches between bulletin entries and monitored cases,
 * creates alerts for users
 */

import { createClient } from '@supabase/supabase-js';
import { generateSearchPatterns, normalizeName } from './name-variations';

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
 * Find name matches in bulletin entries and create alerts
 * Similar to findAndCreateMatches() but for monitored_names instead of monitored_cases
 *
 * @param bulletinDate - Date to check
 * @param supabaseUrl - Supabase URL
 * @param supabaseKey - Supabase service role key
 * @param isHistorical - If true, created alerts are marked as historical (no notifications sent)
 */
export async function findAndCreateNameMatches(
  bulletinDate: string,
  supabaseUrl: string,
  supabaseKey: string,
  isHistorical: boolean = false
): Promise<{
  matches_found: number;
  alerts_created: number;
  details: Array<{
    user_id: string;
    name: string;
    case_number: string;
    juzgado: string;
  }>;
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`[Name Matcher] Checking bulletins for ${bulletinDate} (historical: ${isHistorical})`);

  // 1. Get all bulletin entries for this date
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
      console.error('[Name Matcher] Error fetching bulletin entries:', entriesError);
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

  console.log(`[Name Matcher] Checking ${bulletinEntries.length} bulletin entries for name matches`);

  if (!bulletinEntries || bulletinEntries.length === 0) {
    return { matches_found: 0, alerts_created: 0, details: [] };
  }

  // 2. Get all monitored names with user info
  const { data: monitoredNames, error: namesError } = await supabase
    .from('monitored_names')
    .select(`
      id,
      user_id,
      full_name,
      normalized_name,
      search_mode,
      user_profiles (
        email,
        full_name,
        email_notifications_enabled,
        whatsapp_enabled,
        phone,
        collaborator_emails
      )
    `);

  if (namesError) {
    console.error('[Name Matcher] Error fetching monitored names:', namesError);
    throw namesError;
  }

  console.log(`[Name Matcher] Checking against ${monitoredNames?.length || 0} monitored names`);

  if (!monitoredNames || monitoredNames.length === 0) {
    return { matches_found: 0, alerts_created: 0, details: [] };
  }

  // 3. Match each bulletin entry against all monitored names
  let matchesFound = 0;
  let alertsCreated = 0;
  const matchDetails: Array<{
    user_id: string;
    name: string;
    case_number: string;
    juzgado: string;
  }> = [];

  for (const entry of bulletinEntries) {
    // Normalize the raw_text for matching (remove accents, uppercase)
    const normalizedText = normalizeName(entry.raw_text);

    for (const monitoredName of monitoredNames) {
      // Generate search patterns based on user's chosen mode
      const searchPatterns = generateSearchPatterns(
        monitoredName.full_name,
        monitoredName.search_mode
      );

      // Check if ANY pattern matches the bulletin text
      const matched = searchPatterns.some(pattern => {
        const normalizedPattern = normalizeName(pattern);
        return normalizedText.includes(normalizedPattern);
      });

      if (matched) {
        matchesFound++;

        // Create alert (with duplicate prevention via UNIQUE constraint)
        const { error: alertError } = await supabase
          .from('alerts')
          .insert({
            user_id: monitoredName.user_id,
            monitored_name_id: monitoredName.id,
            bulletin_entry_id: entry.id,
            matched_on: 'name',
            matched_value: monitoredName.full_name,
            is_historical: isHistorical, // Historical alerts don't send notifications
          })
          .select()
          .single();

        if (alertError) {
          // Ignore duplicate constraint errors (already alerted)
          if (!alertError.message.includes('duplicate') && !alertError.message.includes('unique')) {
            console.error('[Name Matcher] Error creating alert:', alertError);
          }
        } else {
          alertsCreated++;
          matchDetails.push({
            user_id: monitoredName.user_id,
            name: monitoredName.full_name,
            case_number: entry.case_number,
            juzgado: entry.juzgado,
          });
        }
      }
    }
  }

  console.log(`[Name Matcher] Found ${matchesFound} matches, created ${alertsCreated} new alerts`);

  return {
    matches_found: matchesFound,
    alerts_created: alertsCreated,
    details: matchDetails,
  };
}

/**
 * Get unsent alerts (for WhatsApp notification sending)
 * IMPORTANT:
 * - Excludes historical alerts (is_historical = true)
 * - Excludes name alerts with fuzzy search mode (no notifications for fuzzy matches)
 */
export async function getUnsentAlerts(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select(`
      id,
      user_id,
      matched_on,
      matched_value,
      created_at,
      user_profiles (
        email,
        phone,
        full_name,
        whatsapp_enabled,
        email_notifications_enabled,
        collaborator_emails
      ),
      monitored_cases (
        case_number,
        juzgado,
        nombre,
        assigned_collaborators
      ),
      monitored_names (
        full_name,
        search_mode,
        assigned_collaborators
      ),
      bulletin_entries (
        bulletin_date,
        raw_text,
        bulletin_url,
        juzgado,
        case_number,
        source
      )
    `)
    .eq('whatsapp_sent', false)
    .eq('is_historical', false)
    .order('created_at', { ascending: true })
    .limit(100); // Process in batches of 100

  if (error) {
    console.error('Error fetching unsent alerts:', error);
    throw error;
  }

  // Filter out fuzzy name matches (no notifications for those)
  const filteredAlerts = (alerts || []).filter(alert => {
    // If it's a name alert with fuzzy search mode, exclude it from notifications
    // Supabase returns joined tables as arrays
    const monitoredName = Array.isArray(alert.monitored_names) ? alert.monitored_names[0] : alert.monitored_names;

    if (alert.matched_on === 'name' && monitoredName?.search_mode === 'fuzzy') {
      console.log(`[Notifications] Skipping fuzzy name match: ${monitoredName.full_name}`);
      return false;
    }
    return true;
  });

  console.log(`[Notifications] Filtered ${alerts?.length || 0} alerts down to ${filteredAlerts.length} (excluded fuzzy matches)`);

  return filteredAlerts;
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

/**
 * Check historical bulletins for multiple cases in batch
 * Used for bulk imports to show progress and search all history
 */
export async function checkHistoricalMatchesBatch(
  cases: Array<{
    userId: string;
    monitoredCaseId: string;
    caseNumber: string;
    juzgado: string;
  }>,
  dateRange: 'all' | '90days',
  supabaseUrl: string,
  supabaseKey: string,
  onProgress?: (progress: {
    phase: 'searching' | 'creating_alerts';
    caseIndex: number;
    totalCases: number;
    caseNumber: string;
    juzgado: string;
    matchesFound: number;
    alertsCreated: number;
  }) => void
): Promise<{
  totalCases: number;
  totalMatchesFound: number;
  totalAlertsCreated: number;
  details: Array<{
    caseNumber: string;
    juzgado: string;
    matchesFound: number;
    alertsCreated: number;
  }>;
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Calculate date range based on parameter
  let startDate: string;
  if (dateRange === 'all') {
    startDate = '2005-01-01'; // Start of 20-year archive
  } else {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    startDate = ninetyDaysAgo.toISOString().split('T')[0];
  }

  console.log(`Batch checking ${cases.length} cases since ${startDate}`);

  const results: Array<{
    caseNumber: string;
    juzgado: string;
    matchesFound: number;
    alertsCreated: number;
  }> = [];

  let totalMatchesFound = 0;
  let totalAlertsCreated = 0;

  // Process cases sequentially for accurate progress tracking
  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i];

    try {
      // Report searching phase
      if (onProgress) {
        onProgress({
          phase: 'searching',
          caseIndex: i,
          totalCases: cases.length,
          caseNumber: caseData.caseNumber,
          juzgado: caseData.juzgado,
          matchesFound: 0,
          alertsCreated: 0,
        });
      }

      // Search for matching bulletin entries
      const { data: bulletinEntries, error: searchError } = await supabase
        .from('bulletin_entries')
        .select('id, bulletin_date, raw_text, bulletin_url, source')
        .eq('case_number', caseData.caseNumber)
        .eq('juzgado', caseData.juzgado)
        .gte('bulletin_date', startDate)
        .order('bulletin_date', { ascending: false });

      if (searchError) {
        console.error(`Error searching for ${caseData.caseNumber}:`, searchError);
        results.push({
          caseNumber: caseData.caseNumber,
          juzgado: caseData.juzgado,
          matchesFound: 0,
          alertsCreated: 0,
        });
        continue;
      }

      const matchesFound = bulletinEntries?.length || 0;
      totalMatchesFound += matchesFound;

      // Report creating alerts phase
      if (onProgress) {
        onProgress({
          phase: 'creating_alerts',
          caseIndex: i,
          totalCases: cases.length,
          caseNumber: caseData.caseNumber,
          juzgado: caseData.juzgado,
          matchesFound,
          alertsCreated: 0,
        });
      }

      // Create alerts if matches found
      let alertsCreated = 0;
      if (bulletinEntries && bulletinEntries.length > 0) {
        const alertsToCreate = bulletinEntries.map((entry) => ({
          user_id: caseData.userId,
          monitored_case_id: caseData.monitoredCaseId,
          bulletin_entry_id: entry.id,
          matched_on: 'case_number',
          matched_value: caseData.caseNumber,
          is_historical: true, // Mark as historical to prevent notifications
        }));

        const { data: createdAlerts, error: alertsError } = await supabase
          .from('alerts')
          .upsert(alertsToCreate, {
            onConflict: 'user_id,bulletin_entry_id,monitored_case_id',
            ignoreDuplicates: true,
          })
          .select();

        if (alertsError) {
          console.error(`Error creating alerts for ${caseData.caseNumber}:`, alertsError);
        } else {
          alertsCreated = createdAlerts?.length || 0;
          totalAlertsCreated += alertsCreated;
        }
      }

      results.push({
        caseNumber: caseData.caseNumber,
        juzgado: caseData.juzgado,
        matchesFound,
        alertsCreated,
      });

      // Final progress update for this case
      if (onProgress) {
        onProgress({
          phase: 'creating_alerts',
          caseIndex: i,
          totalCases: cases.length,
          caseNumber: caseData.caseNumber,
          juzgado: caseData.juzgado,
          matchesFound,
          alertsCreated,
        });
      }

      console.log(
        `Case ${i + 1}/${cases.length}: ${caseData.caseNumber} - ${matchesFound} matches, ${alertsCreated} alerts`
      );
    } catch (error) {
      console.error(`Error processing case ${caseData.caseNumber}:`, error);
      results.push({
        caseNumber: caseData.caseNumber,
        juzgado: caseData.juzgado,
        matchesFound: 0,
        alertsCreated: 0,
      });
    }
  }

  console.log(
    `Batch processing complete: ${totalMatchesFound} total matches, ${totalAlertsCreated} total alerts`
  );

  return {
    totalCases: cases.length,
    totalMatchesFound,
    totalAlertsCreated,
    details: results,
  };
}
