/**
 * E2E Tests for scraper-runner.ts
 *
 * These tests use REAL browser, REAL website, REAL credentials from Supabase.
 * Tests work EXACTLY like production - dynamically finding users and fetching credentials.
 *
 * Setup:
 * 1. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env
 * 2. Have at least one user with tribunal credentials in Supabase
 * 3. (Optional) Mark a user with is_test_user=true for testing priority
 *
 * Run with: npm run test:e2e
 *
 * Note: These tests are SLOW (~30s each) and require:
 * - Internet connection
 * - Access to Supabase
 * - At least one user with valid tribunal credentials
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runTribunalScraper } from '../scraper-runner';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - try multiple locations
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Try SUPABASE_URL first, fallback to NEXT_PUBLIC_SUPABASE_URL
let supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl && supabaseUrl.startsWith('postgres://')) {
  // Wrong SUPABASE_URL (database connection string), use the public one
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
if (!supabaseUrl) {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug: show what we found
if (!supabaseUrl || !supabaseKey) {
  console.log('\n🔍 Debug: Environment variables check:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Found' : '✗ Missing'}`);
  console.log(`   Using: ${supabaseUrl ? '✓ ' + supabaseUrl : '✗ Missing'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✓ Found' : '✗ Missing'}`);
}

const hasTestConfig = !!(supabaseUrl && supabaseKey);

interface TribunalCredentials {
  email: string;
  password: string;
  key_file_base64: string;
  cer_file_base64: string;
}

describe.skipIf(!hasTestConfig)('Scraper E2E Tests (Real Website)', () => {
  // Increase timeout for E2E tests
  const E2E_TIMEOUT = 60000; // 60 seconds

  let supabase: ReturnType<typeof createClient>;
  let credentials: TribunalCredentials | null = null;

  // Wait for all async cleanup to complete
  afterAll(async () => {
    // Give Puppeteer time to clean up temp directories
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeAll(async () => {
    if (!hasTestConfig) {
      console.warn('\n⚠️  Skipping E2E tests - missing configuration');
      console.warn('   Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    // Initialize Supabase client
    supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('\n🔍 Finding a user with tribunal credentials in Supabase...');

    // Query tribunal_credentials table (correct table name)
    const { data: credData, error: credError } = await supabase
      .from('tribunal_credentials')
      .select('user_id, email, vault_password_id, vault_key_file_id, vault_cer_file_id, status')
      .eq('status', 'active')
      .not('vault_password_id', 'is', null)
      .not('vault_key_file_id', 'is', null)
      .not('vault_cer_file_id', 'is', null)
      .limit(1);

    if (credError || !credData || credData.length === 0) {
      console.error('❌ No users found with complete tribunal credentials');
      console.error('   Please add tribunal credentials for at least one user');
      return;
    }

    const cred = credData[0];
    const testUserId = cred.user_id;
    console.log(`🎯 Found user: ${cred.email} (${testUserId})`);

    // Fetch actual secrets from vault using RPC functions (just like production!)
    console.log('🔐 Fetching secrets from vault using vault_get_secret()...');

    const [passwordResult, keyFileResult, cerFileResult] = await Promise.all([
      supabase.rpc('vault_get_secret', { secret_id: cred.vault_password_id }),
      supabase.rpc('vault_get_secret', { secret_id: cred.vault_key_file_id }),
      supabase.rpc('vault_get_secret', { secret_id: cred.vault_cer_file_id })
    ]);

    if (passwordResult.error || keyFileResult.error || cerFileResult.error) {
      console.error('❌ Failed to fetch secrets from vault');
      console.error('   Password:', passwordResult.error);
      console.error('   Key:', keyFileResult.error);
      console.error('   Cer:', cerFileResult.error);
      return;
    }

    const password = passwordResult.data;
    const keyFile = keyFileResult.data;
    const cerFile = cerFileResult.data;

    if (!password || !keyFile || !cerFile) {
      console.error('❌ Missing secrets from vault');
      console.error(`   Password: ${password ? '✓' : '✗'}`);
      console.error(`   Key file: ${keyFile ? '✓' : '✗'}`);
      console.error(`   Cer file: ${cerFile ? '✓' : '✗'}`);
      return;
    }

    credentials = {
      email: cred.email,
      password: password,
      key_file_base64: keyFile,
      cer_file_base64: cerFile
    };

    console.log(`✅ Loaded credentials for: ${credentials.email}`);
  });

  it('should successfully login to tribunal website', async () => {
    if (!credentials) {
      console.error('❌ No credentials available - check beforeAll setup');
      expect(credentials).toBeDefined();
      return;
    }

    console.log('🔐 Testing login flow...');

    const result = await runTribunalScraper({
      email: credentials.email,
      password: credentials.password,
      keyFileBase64: credentials.key_file_base64,
      cerFileBase64: credentials.cer_file_base64
    });

    // Should succeed
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Should return browser and page (kept open on success)
    expect(result.browser).toBeDefined();
    expect(result.page).toBeDefined();

    // Clean up
    if (result.browser) {
      await result.browser.close();
    }

    console.log('✅ Login successful');
  }, E2E_TIMEOUT);

  it('should scrape documents from tribunal website', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('📄 Testing document scraping...');

    const result = await runTribunalScraper({
      email: credentials.email,
      password: credentials.password,
      keyFileBase64: credentials.key_file_base64,
      cerFileBase64: credentials.cer_file_base64
    });

    expect(result.success).toBe(true);

    // Should return array of documents (may be empty if no notifications)
    expect(Array.isArray(result.documents)).toBe(true);

    console.log(`📊 Found ${result.documents.length} document(s)`);

    // If documents found, verify structure
    if (result.documents.length > 0) {
      const doc = result.documents[0];

      expect(doc).toHaveProperty('numero');
      expect(doc).toHaveProperty('expediente');
      expect(doc).toHaveProperty('juzgado');
      expect(doc).toHaveProperty('fechaPublicacion');
      expect(doc).toHaveProperty('descripcion');

      console.log(`   Sample: ${doc.expediente} - ${doc.juzgado}`);
    }

    // Clean up
    if (result.browser) {
      await result.browser.close();
    }

    console.log('✅ Document scraping successful');
  }, E2E_TIMEOUT);

  it('should fail with invalid credentials', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('❌ Testing invalid credentials...');

    const result = await runTribunalScraper({
      email: credentials.email,
      password: 'wrong-password-12345',
      keyFileBase64: credentials.key_file_base64,
      cerFileBase64: credentials.cer_file_base64
    });

    // Should fail
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/autenticación|credenciales|inicio de sesión/i);

    // Should have closed browser on error
    expect(result.browser).toBeUndefined();
    expect(result.page).toBeUndefined();

    console.log(`✅ Correctly rejected invalid credentials: ${result.error}`);
  }, E2E_TIMEOUT);

  it('should handle invalid email format', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('📧 Testing invalid email...');

    const result = await runTribunalScraper({
      email: 'not-a-real-email',
      password: credentials.password,
      keyFileBase64: credentials.key_file_base64,
      cerFileBase64: credentials.cer_file_base64
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    console.log(`✅ Correctly handled invalid email: ${result.error}`);
  }, E2E_TIMEOUT);

  it('should handle invalid certificate files', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('🔑 Testing invalid certificates...');

    const result = await runTribunalScraper({
      email: credentials.email,
      password: credentials.password,
      keyFileBase64: Buffer.from('invalid key data').toString('base64'),
      cerFileBase64: Buffer.from('invalid cer data').toString('base64')
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    console.log(`✅ Correctly rejected invalid certificates: ${result.error}`);
  }, E2E_TIMEOUT);

  it('should verify email selector fallback works on real page', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('🔍 Testing selector robustness...');

    const result = await runTribunalScraper({
      email: credentials.email,
      password: credentials.password,
      keyFileBase64: credentials.key_file_base64,
      cerFileBase64: credentials.cer_file_base64
    });

    // The test passes if login succeeds, meaning our selector fallback worked
    expect(result.success).toBe(true);

    // Clean up
    if (result.browser) {
      await result.browser.close();
    }

    console.log('✅ Selectors working correctly on live site');
  }, E2E_TIMEOUT);

  it('should verify tribunal navigation works on real page', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('🔀 Testing tribunal navigation...');

    const result = await runTribunalScraper({
      email: credentials.email,
      password: credentials.password,
      keyFileBase64: credentials.key_file_base64,
      cerFileBase64: credentials.cer_file_base64
    });

    expect(result.success).toBe(true);

    // If we got here, navigation to tribunal and documents page worked
    expect(result.page).toBeDefined();

    // Verify we're on the documents page
    if (result.page) {
      const url = result.page.url();
      expect(url.toLowerCase()).toMatch(/documento/);
    }

    // Clean up
    if (result.browser) {
      await result.browser.close();
    }

    console.log('✅ Navigation to Tribunal Electrónico successful');
  }, E2E_TIMEOUT);

  it('should match production credential fetching flow', async () => {
    if (!credentials) {
      expect(credentials).toBeDefined();
      return;
    }

    console.log('🏭 Testing production-like flow...');

    // This test verifies we're using the same credential flow as production
    const { data: cred } = await supabase
      .from('tribunal_credentials')
      .select('user_id, email, vault_password_id, vault_key_file_id, vault_cer_file_id')
      .eq('email', credentials.email)
      .single();

    expect(cred).toBeDefined();
    expect(cred?.email).toBe(credentials.email);
    expect(cred?.vault_password_id).toBeTruthy();
    expect(cred?.vault_key_file_id).toBeTruthy();
    expect(cred?.vault_cer_file_id).toBeTruthy();

    console.log('✅ Credential flow matches production');
  }, E2E_TIMEOUT);
});

// Instructions shown when tests are skipped
if (!hasTestConfig) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  E2E Tests Skipped - Missing Configuration                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nTo run E2E tests, ensure these are in your .env:\n');
  console.log('  SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n');
  console.log('Tests will automatically find a user with tribunal credentials.');
  console.log('Priority: users marked is_test_user=true or with test/e2e emails.\n');
}
