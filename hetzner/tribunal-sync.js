#!/usr/bin/env node
/**
 * Tribunal Electrónico Sync Script (Hetzner Only)
 *
 * This script runs on Hetzner and directly syncs tribunal documents.
 * It does NOT make HTTP requests to Vercel - it connects directly to Supabase.
 *
 * Usage:
 *   node hetzner/tribunal-sync.js
 *
 * Environment Variables Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_GEMINI_API_KEY
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM
 *   TWILIO_WHATSAPP_ALERT_TEMPLATE_SID
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { syncTribunalForUser } = require('./lib/tribunal/sync-service');
const { createNotificationLogger } = require('../lib/notification-logger');

// Handle cleanup errors from puppeteer plugins without crashing
process.on('unhandledRejection', (reason, promise) => {
  // Log the error but don't crash - puppeteer cleanup errors are non-critical
  if (reason && reason.code === 'ENOTEMPTY') {
    console.warn('[Sync] Puppeteer cleanup warning (non-critical):', reason.message);
  } else {
    console.error('[Sync] Unhandled rejection:', reason);
  }
});

// Cleanup old puppeteer temp directories (7+ days old)
function cleanupOldTempDirs() {
  const fs = require('fs');
  const path = require('path');
  const tmpDir = '/tmp';

  try {
    const files = fs.readdirSync(tmpDir);
    const puppeteerDirs = files.filter(f => f.startsWith('puppeteer_dev_profile-'));

    let cleaned = 0;
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    for (const dir of puppeteerDirs) {
      const fullPath = path.join(tmpDir, dir);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.mtimeMs < sevenDaysAgo) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          cleaned++;
        }
      } catch (err) {
        // Ignore errors - directory might be in use
      }
    }

    if (cleaned > 0) {
      console.log(`[Sync] Cleaned ${cleaned} old puppeteer temp director(ies)`);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Tribunal Sync] Missing Supabase configuration');
    process.exit(1);
  }

  // Initialize service client and logger
  const supabase = createClient(supabaseUrl, supabaseKey);
  const logger = createNotificationLogger(supabaseUrl, supabaseKey);

  try {
    // Clean up old temp directories before starting
    cleanupOldTempDirs();

    logger.info('Starting Tribunal Electrónico sync job');
    console.log('[Tribunal Sync] Starting sync job...');

    // Query all users with active or retry credentials
    const { data: users, error: usersError } = await supabase
      .from('tribunal_credentials')
      .select('user_id, email, vault_password_id, vault_key_file_id, vault_cer_file_id, retry_count')
      .in('status', ['active', 'retry']);

    if (usersError) {
      logger.error('Error fetching users:', undefined, { error: usersError });
      throw usersError;
    }

    if (!users || users.length === 0) {
      logger.info('No active users to sync');
      console.log('[Tribunal Sync] No active users to sync');
      await logger.flush();
      process.exit(0);
    }

    logger.info(`Found ${users.length} active users to sync`);
    console.log(`[Tribunal Sync] Found ${users.length} active users`);

    const results = {
      totalUsers: users.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Sync each user
    for (const user of users) {
      try {
        logger.info(`Syncing user ${user.user_id} (${user.email})`);
        console.log(`[Tribunal Sync] Syncing user ${user.user_id}...`);

        const syncResult = await syncTribunalForUser({
          userId: user.user_id,
          vaultPasswordId: user.vault_password_id,
          vaultKeyFileId: user.vault_key_file_id,
          vaultCerFileId: user.vault_cer_file_id,
          email: user.email,
          retryCount: user.retry_count || 0,
          supabase,
          logger
        });

        if (syncResult.success) {
          results.successful++;
          logger.info(
            `✓ User ${user.user_id} sync completed: ${syncResult.newDocuments} new, ${syncResult.documentsProcessed} processed`
          );
          console.log(
            `[Tribunal Sync] ✓ User ${user.user_id}: ${syncResult.newDocuments} new docs, ${syncResult.documentsProcessed} processed`
          );
        } else {
          results.failed++;
          results.errors.push(`User ${user.user_id}: ${syncResult.error}`);
          logger.error(`✗ User ${user.user_id} sync failed`, undefined, {
            error: syncResult.error
          });
          console.error(`[Tribunal Sync] ✗ User ${user.user_id} failed:`, syncResult.error);
        }

        // Small delay between users to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`User ${user.user_id}: ${errorMsg}`);
        logger.error(`Error syncing user ${user.user_id}`, undefined, { error: errorMsg });
        console.error(`[Tribunal Sync] Error syncing user ${user.user_id}:`, error);
      }
    }

    // Flush logger
    await logger.flush();

    console.log('[Tribunal Sync] Job completed:', results);
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Tribunal sync job failed', undefined, { error: errorMsg });
    await logger.flush();

    console.error('[Tribunal Sync] Job failed:', error);
    process.exit(1);
  }
}

main();
