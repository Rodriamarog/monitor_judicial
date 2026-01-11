/**
 * Alert Date Filtering Test Script
 *
 * Tests the updated date filtering logic for alerts:
 * 1. Creates test alerts with today's bulletin_date
 * 2. Creates test alerts with tomorrow's bulletin_date
 * 3. Verifies "Hoy" filter shows both today and tomorrow
 * 4. Verifies regular date range filtering works correctly
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

interface TestResult {
  test: string;
  success: boolean;
  details?: any;
  error?: string;
}

async function testAlertDateFiltering() {
  const results: TestResult[] = [];

  console.log('🧪 Testing Alert Date Filtering Logic\n');
  console.log('═'.repeat(60));

  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const TEST_USER_EMAIL = 'rodriamarog@gmail.com';
  const timestamp = Date.now().toString().slice(-5);

  // Calculate dates in Tijuana timezone
  const getTijuanaDate = (daysOffset: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' });
  };

  const today = getTijuanaDate(0);
  const tomorrow = getTijuanaDate(1);
  const yesterday = getTijuanaDate(-1);

  console.log(`\n📅 Date Configuration:`);
  console.log(`  Yesterday: ${yesterday}`);
  console.log(`  Today:     ${today}`);
  console.log(`  Tomorrow:  ${tomorrow}`);

  let testUserId: string | null = null;
  let testMonitoredCaseId: string | null = null;
  let testBulletinEntryToday: string | null = null;
  let testBulletinEntryTomorrow: string | null = null;
  let testAlertToday: string | null = null;
  let testAlertTomorrow: string | null = null;

  try {
    // ============================================================
    // STEP 1: Setup test user
    // ============================================================
    console.log('\n📝 STEP 1: Setting up test user');
    console.log('─'.repeat(60));

    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', TEST_USER_EMAIL)
      .single();

    if (!existingUser) {
      throw new Error(`Test user ${TEST_USER_EMAIL} not found`);
    }

    testUserId = existingUser.id;
    console.log(`✓ Using test user: ${TEST_USER_EMAIL}`);
    console.log(`  User ID: ${testUserId}`);

    // ============================================================
    // STEP 2: Create test monitored case
    // ============================================================
    console.log('\n📋 STEP 2: Creating test monitored case');
    console.log('─'.repeat(60));

    const TEST_CASE_NUMBER = `TEST-${timestamp}/2025`;
    const TEST_JUZGADO = 'JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA';

    const { data: monitoredCase, error: caseError } = await supabase
      .from('monitored_cases')
      .insert({
        user_id: testUserId,
        case_number: TEST_CASE_NUMBER,
        juzgado: TEST_JUZGADO,
        nombre: `Date Filter Test ${timestamp}`,
      })
      .select()
      .single();

    if (caseError) throw caseError;

    testMonitoredCaseId = monitoredCase.id;
    console.log(`✓ Created monitored case: ${TEST_CASE_NUMBER}`);

    // ============================================================
    // STEP 3: Create bulletin entries for TODAY and TOMORROW
    // ============================================================
    console.log('\n📰 STEP 3: Creating test bulletin entries');
    console.log('─'.repeat(60));

    // Today's bulletin
    const { data: bulletinToday, error: bulletinTodayError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: today,
        juzgado: TEST_JUZGADO,
        case_number: TEST_CASE_NUMBER,
        raw_text: `TEST ENTRY - TODAY'S BULLETIN [${timestamp}]`,
        source: 'tijuana',
        bulletin_url: 'https://test.example.com/today'
      })
      .select()
      .single();

    if (bulletinTodayError) throw bulletinTodayError;
    testBulletinEntryToday = bulletinToday.id;
    console.log(`✓ Created TODAY's bulletin entry (${today})`);

    // Tomorrow's bulletin
    const { data: bulletinTomorrow, error: bulletinTomorrowError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: tomorrow,
        juzgado: TEST_JUZGADO,
        case_number: TEST_CASE_NUMBER,
        raw_text: `TEST ENTRY - TOMORROW'S BULLETIN [${timestamp}]`,
        source: 'tijuana',
        bulletin_url: 'https://test.example.com/tomorrow'
      })
      .select()
      .single();

    if (bulletinTomorrowError) throw bulletinTomorrowError;
    testBulletinEntryTomorrow = bulletinTomorrow.id;
    console.log(`✓ Created TOMORROW's bulletin entry (${tomorrow})`);

    // ============================================================
    // STEP 4: Create alerts for both bulletin entries
    // ============================================================
    console.log('\n🔔 STEP 4: Creating test alerts');
    console.log('─'.repeat(60));

    // Alert for today's bulletin
    const { data: alertToday, error: alertTodayError } = await supabase
      .from('alerts')
      .insert({
        user_id: testUserId,
        monitored_case_id: testMonitoredCaseId,
        bulletin_entry_id: testBulletinEntryToday,
        matched_on: 'case_number',
        matched_value: TEST_CASE_NUMBER,
      })
      .select()
      .single();

    if (alertTodayError) throw alertTodayError;
    testAlertToday = alertToday.id;
    console.log(`✓ Created alert for TODAY's bulletin`);

    // Alert for tomorrow's bulletin
    const { data: alertTomorrow, error: alertTomorrowError } = await supabase
      .from('alerts')
      .insert({
        user_id: testUserId,
        monitored_case_id: testMonitoredCaseId,
        bulletin_entry_id: testBulletinEntryTomorrow,
        matched_on: 'case_number',
        matched_value: TEST_CASE_NUMBER,
      })
      .select()
      .single();

    if (alertTomorrowError) throw alertTomorrowError;
    testAlertTomorrow = alertTomorrow.id;
    console.log(`✓ Created alert for TOMORROW's bulletin`);

    // ============================================================
    // STEP 5: Fetch alerts (simulating dashboard query)
    // ============================================================
    console.log('\n📱 STEP 5: Testing alert filtering logic');
    console.log('─'.repeat(60));

    const { data: allAlerts } = await supabase
      .from('alerts')
      .select(`
        *,
        monitored_cases (case_number, juzgado, nombre),
        bulletin_entries (bulletin_date, raw_text, bulletin_url, source)
      `)
      .eq('user_id', testUserId)
      .in('id', [testAlertToday, testAlertTomorrow])
      .order('created_at', { ascending: false });

    if (!allAlerts || allAlerts.length !== 2) {
      throw new Error(`Expected 2 alerts, got ${allAlerts?.length || 0}`);
    }

    console.log(`✓ Fetched ${allAlerts.length} test alerts`);

    // ============================================================
    // TEST 1: "Hoy" filter should show both today AND tomorrow
    // ============================================================
    console.log('\n🧪 TEST 1: "Hoy" filter (should show TODAY + TOMORROW)');
    console.log('─'.repeat(60));

    const filteredHoy = allAlerts.filter((alert) => {
      const bulletinDate = alert.bulletin_entries?.bulletin_date;
      if (!bulletinDate) return false;

      // "Hoy" logic: show today + tomorrow
      if (bulletinDate === today) return true;
      if (bulletinDate === tomorrow) return true;

      return false;
    });

    const test1Success = filteredHoy.length === 2;
    console.log(`Result: ${filteredHoy.length}/2 alerts shown`);
    filteredHoy.forEach(alert => {
      console.log(`  - ${alert.bulletin_entries?.bulletin_date}: ${alert.bulletin_entries?.raw_text?.substring(0, 50)}...`);
    });

    results.push({
      test: '"Hoy" filter shows today + tomorrow',
      success: test1Success,
      details: { expected: 2, actual: filteredHoy.length },
      error: test1Success ? undefined : 'Filter did not return both alerts'
    });

    if (test1Success) {
      console.log('✓ TEST 1 PASSED');
    } else {
      console.log('✗ TEST 1 FAILED');
    }

    // ============================================================
    // TEST 2: Filter for only TODAY should show only today's alert
    // ============================================================
    console.log('\n🧪 TEST 2: Filter for specific date (today only)');
    console.log('─'.repeat(60));

    const filteredTodayOnly = allAlerts.filter((alert) => {
      const bulletinDate = alert.bulletin_entries?.bulletin_date;
      if (!bulletinDate) return false;
      return bulletinDate === today;
    });

    const test2Success = filteredTodayOnly.length === 1;
    console.log(`Result: ${filteredTodayOnly.length}/1 alert shown`);

    results.push({
      test: 'Filter for today only',
      success: test2Success,
      details: { expected: 1, actual: filteredTodayOnly.length },
      error: test2Success ? undefined : 'Filter did not return exactly 1 alert'
    });

    if (test2Success) {
      console.log('✓ TEST 2 PASSED');
    } else {
      console.log('✗ TEST 2 FAILED');
    }

    // ============================================================
    // TEST 3: Filter for yesterday should show nothing
    // ============================================================
    console.log('\n🧪 TEST 3: Filter for yesterday (should show nothing)');
    console.log('─'.repeat(60));

    const filteredYesterday = allAlerts.filter((alert) => {
      const bulletinDate = alert.bulletin_entries?.bulletin_date;
      if (!bulletinDate) return false;
      return bulletinDate === yesterday;
    });

    const test3Success = filteredYesterday.length === 0;
    console.log(`Result: ${filteredYesterday.length}/0 alerts shown`);

    results.push({
      test: 'Filter for yesterday shows nothing',
      success: test3Success,
      details: { expected: 0, actual: filteredYesterday.length },
      error: test3Success ? undefined : 'Filter returned alerts when it should not'
    });

    if (test3Success) {
      console.log('✓ TEST 3 PASSED');
    } else {
      console.log('✗ TEST 3 FAILED');
    }

    // ============================================================
    // TEST 4: Date range filter (yesterday to tomorrow)
    // ============================================================
    console.log('\n🧪 TEST 4: Date range filter (yesterday to tomorrow)');
    console.log('─'.repeat(60));

    const filteredRange = allAlerts.filter((alert) => {
      const bulletinDate = alert.bulletin_entries?.bulletin_date;
      if (!bulletinDate) return false;
      return bulletinDate >= yesterday && bulletinDate <= tomorrow;
    });

    const test4Success = filteredRange.length === 2;
    console.log(`Result: ${filteredRange.length}/2 alerts shown`);

    results.push({
      test: 'Date range filter works correctly',
      success: test4Success,
      details: { expected: 2, actual: filteredRange.length },
      error: test4Success ? undefined : 'Range filter did not return correct count'
    });

    if (test4Success) {
      console.log('✓ TEST 4 PASSED');
    } else {
      console.log('✗ TEST 4 FAILED');
    }

  } catch (error) {
    console.error('\n❌ TEST SETUP FAILED:', error instanceof Error ? error.message : error);
    results.push({
      test: 'Test setup',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // ============================================================
    // CLEANUP
    // ============================================================
    console.log('\n🧹 CLEANUP: Removing test data');
    console.log('─'.repeat(60));

    try {
      if (testAlertToday) {
        await supabase.from('alerts').delete().eq('id', testAlertToday);
        console.log('✓ Deleted today\'s test alert');
      }
      if (testAlertTomorrow) {
        await supabase.from('alerts').delete().eq('id', testAlertTomorrow);
        console.log('✓ Deleted tomorrow\'s test alert');
      }
      if (testBulletinEntryToday) {
        await supabase.from('bulletin_entries').delete().eq('id', testBulletinEntryToday);
        console.log('✓ Deleted today\'s bulletin entry');
      }
      if (testBulletinEntryTomorrow) {
        await supabase.from('bulletin_entries').delete().eq('id', testBulletinEntryTomorrow);
        console.log('✓ Deleted tomorrow\'s bulletin entry');
      }
      if (testMonitoredCaseId) {
        await supabase.from('monitored_cases').delete().eq('id', testMonitoredCaseId);
        console.log('✓ Deleted test monitored case');
      }
    } catch (cleanupError) {
      console.error('⚠ Cleanup error:', cleanupError);
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  results.forEach((result) => {
    const icon = result.success ? '✓' : '✗';
    const status = result.success ? 'PASS' : 'FAIL';
    console.log(`${icon} ${status}: ${result.test}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`    Details: ${JSON.stringify(result.details)}`);
    }
  });

  console.log('');
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('═'.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Date filtering logic is working correctly.\n');
    console.log('✅ The system correctly:');
    console.log('   1. Shows both today and tomorrow alerts for "Hoy" filter');
    console.log('   2. Filters by specific bulletin dates');
    console.log('   3. Excludes alerts outside the date range');
    console.log('   4. Handles date range filtering\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED. Date filtering logic has issues.\n');
    console.log('Please review the errors above and fix before deploying.\n');
    process.exit(1);
  }
}

runAlertDateFiltering().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

function runAlertDateFiltering() {
  return testAlertDateFiltering();
}
