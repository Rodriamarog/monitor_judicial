# Maintainability & Debugging Guide

**Grade: C+ → Target: A-**

This guide shows you how to debug issues when the scraper breaks (and it will!).

## Current State: What Works & What Doesn't

### ✅ What Works Well

1. **Basic success/failure logging** - You can tell if sync succeeded or failed
2. **User identification** - Logs include user IDs and emails
3. **Document counting** - You know how many docs were found/processed
4. **Dual logging** - Console logs + database logs (`notification_logs` table)
5. **Health endpoint** - `/health` tells you if server is alive

### ❌ What's Missing (Critical Issues)

1. **No context when errors occur** - "Login failed" doesn't tell you WHY
2. **Silent failures** - Some errors are caught but not logged
3. **Missing step tracking** - Can't tell WHICH step failed in a 10-step process
4. **No timing data** - Can't tell if slowness is scraper, PDF, or AI
5. **Lost logs on database failure** - If Supabase is down, logs disappear forever

---

## Common Debugging Scenarios

### Scenario 1: "Scraper stopped working for user X"

**What you currently see:**
```
[Tribunal Sync] ✗ User abc-123 failed: Scraper failed
```

**What's missing:** WHY it failed (login? navigation? selector changed?)

**How to debug NOW:**

1. **Check the logs:**
   ```bash
   docker compose logs --tail=200 | grep "abc-123"
   ```

2. **Look for the last successful step:**
   ```
   [Scraper] Launching browser...        ← Got here
   [Scraper] Navigating to login page... ← Got here
   [Scraper] Entering email...           ← Failed here (no next step)
   ```

3. **Run validation manually to see detailed error:**
   ```bash
   # From Vercel app, go to Settings → Tribunal → Re-validate credentials
   # Watch the SSE stream for specific error
   ```

4. **Access container shell to investigate:**
   ```bash
   docker compose exec scraper bash
   ls -la /tmp/  # Check for screenshot files
   cat /tmp/error-screenshot-*.png | base64  # View screenshot
   ```

5. **Check Supabase logs:**
   ```sql
   SELECT * FROM notification_logs
   WHERE message LIKE '%abc-123%'
   ORDER BY created_at DESC
   LIMIT 50;
   ```

**How to debug BETTER (after improvements):**
```
[Scraper] Step: EMAIL_ENTRY, User: abc-123, Selector: input[type="email"]
[Scraper] Error: Timeout waiting for selector 'input[type="email"]'
[Scraper] Screenshot saved: /tmp/error-abc-123-email-1234567890.png
[Scraper] Current URL: https://sjpo.pjbc.gob.mx/login.aspx
[Scraper] Stack: Error at line 145 in scraper-runner.ts
```

### Scenario 2: "PDFs not downloading"

**What you currently see:**
```
[Sync] Processing EXPEDIENTE 123/2024: ACUERDO
[Sync] PDF download failed
```

**What's missing:** Error details, file size, storage quota

**How to debug NOW:**

1. **Check Supabase Storage quota:**
   ```sql
   -- In Supabase dashboard
   SELECT pg_size_pretty(sum(metadata->>'size')::bigint) as total_size
   FROM storage.objects
   WHERE bucket_id = 'case-files';
   ```

2. **Check the document onclick attribute:**
   ```bash
   docker compose exec scraper npm run sync 2>&1 | grep "downloadOnclick"
   ```

3. **Check if document exists in page:**
   - The scraper logs document list
   - Verify expediente 123/2024 is in the list
   - Check if `downloadOnclick` is present

**How to debug BETTER (after improvements):**
```
[PDF] Downloading: EXPEDIENTE 123/2024
[PDF] Process ID: proc-abc-123
[PDF] File size: 2.4MB
[PDF] Upload to: case-files/user-abc/doc-123.pdf
[PDF] Error: 413 Request Entity Too Large
[PDF] Storage quota: 4.8GB / 5.0GB used
```

### Scenario 3: "WhatsApp not sending"

**What you currently see:**
```
[WhatsApp] Failed to send alert: error message
```

**What's missing:** User phone, Twilio error code, message content

**How to debug NOW:**

1. **Check user phone number:**
   ```sql
   SELECT phone, whatsapp_enabled
   FROM user_profiles
   WHERE id = 'user-abc-123';
   ```

2. **Check Twilio logs:**
   - Go to Twilio console
   - Check error logs for that phone number
   - Common errors: invalid number, unverified number, rate limit

3. **Test phone number format:**
   ```bash
   # In container
   docker compose exec scraper node -e "
   const { formatToWhatsApp } = require('../lib/whatsapp');
   console.log(formatToWhatsApp('6641234567'));
   "
   ```

**How to debug BETTER (after improvements):**
```
[WhatsApp] User: abc-123, Phone: +526641234567
[WhatsApp] Expediente: 123/2024
[WhatsApp] Template: HXd2473dd (Tribunal Alert)
[WhatsApp] Twilio Error: 63016 - Invalid phone number format
[WhatsApp] Retry 1/3 in 5s...
```

---

## Quick Fix: Add Better Error Logging

### 1. Enhance Scraper Errors

**File:** `hetzner/lib/tribunal/scraper-runner.ts`

**Line 274** (current):
```typescript
} catch (error) {
  console.error('[Scraper] Error:', error);
  // ...
}
```

**Replace with:**
```typescript
} catch (error) {
  // Take screenshot for visual debugging
  const screenshot = await page.screenshot({
    path: `/tmp/error-${Date.now()}.png`,
    fullPage: true
  }).catch(() => null);

  console.error('[Scraper] Fatal Error:', {
    message: error.message,
    step: 'unknown', // TODO: track current step
    url: page ? page.url() : 'unknown',
    email,
    screenshot: screenshot ? 'Saved to /tmp/error-*.png' : 'Not available',
    stack: error.stack
  });

  await browser.close().catch(() => {});

  return {
    success: false,
    documents: [],
    error: error instanceof Error ? error.message : 'Error desconocido'
  };
}
```

### 2. Log Silent Failures

**File:** `hetzner/lib/tribunal/scraper-runner.ts`

**Lines 118-121** (current):
```typescript
} catch (e) {
  continue; // SILENT FAILURE
}
```

**Replace with:**
```typescript
} catch (e) {
  console.warn(`[Scraper] Email selector '${selector}' failed:`, e.message);
  continue;
}
```

### 3. Add Step Tracking

**File:** `hetzner/lib/tribunal/sync-service.ts`

**Add at top of file:**
```typescript
enum SyncStep {
  INIT = 'init',
  FETCH_CASES = 'fetch_cases',
  FETCH_CREDENTIALS = 'fetch_credentials',
  RUN_SCRAPER = 'run_scraper',
  PROCESS_DOCUMENTS = 'process_documents',
  DOWNLOAD_PDF = 'download_pdf',
  GENERATE_SUMMARY = 'generate_summary',
  SEND_WHATSAPP = 'send_whatsapp',
  COMPLETE = 'complete'
}

let currentStep: SyncStep = SyncStep.INIT;
```

**Wrap each major operation:**
```typescript
try {
  currentStep = SyncStep.FETCH_CREDENTIALS;
  logger.info(`Step: ${currentStep}`, undefined, { userId });

  const { data: password } = await supabase.rpc('vault_get_secret', ...);

  // ... rest of code
} catch (error) {
  logger.error(`Failed at step: ${currentStep}`, undefined, {
    userId,
    step: currentStep,
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

### 4. Fix Log Loss Issue

**File:** `lib/notification-logger.ts`

**Lines 82-104** (current):
```typescript
} finally {
  this.batchLogs = []; // LOGS LOST IF INSERT FAILS
}
```

**Replace with:**
```typescript
} catch (err) {
  console.error('Failed to write notification logs to database:', err);

  // Fallback: write to file
  try {
    const fs = require('fs');
    fs.appendFileSync(
      '/tmp/notification-logs-fallback.jsonl',
      this.batchLogs.map(log => JSON.stringify(log)).join('\n') + '\n'
    );
    console.log(`Wrote ${this.batchLogs.length} logs to fallback file`);
  } catch (fileErr) {
    console.error('Could not write fallback logs:', fileErr);
  }
} finally {
  this.batchLogs = []; // Only clear after success OR fallback
}
```

---

## Deployment Workflow (Make Changes & Redeploy)

### Local Testing (Before Deploying to Hetzner)

```bash
# 1. Make your code changes
nano hetzner/lib/tribunal/scraper-runner.ts

# 2. Rebuild Docker image
cd /home/rodrigo/code/monitor_judicial/hetzner
docker compose build

# 3. Restart container with new code
docker compose down
docker compose up -d

# 4. Test manually
docker compose exec scraper npm run sync

# 5. Check logs for improvements
docker compose logs --tail=100

# 6. If it works, commit changes
git add .
git commit -m "Improve scraper error logging"
```

### Deploy to Hetzner

```bash
# 1. Push changes to git
git push origin main

# 2. SSH to Hetzner
ssh user@hetzner-ip

# 3. Pull latest code
cd /opt/monitor_judicial
git pull origin main

# 4. Rebuild Docker image
cd hetzner
docker compose build

# 5. Restart with zero downtime
docker compose up -d

# 6. Verify health
curl http://localhost:3001/health

# 7. Watch logs for issues
docker compose logs -f --tail=50
```

**Rollback if something breaks:**
```bash
git checkout HEAD~1  # Go back one commit
docker compose build
docker compose up -d
```

---

## Monitoring & Alerts

### 1. Check Logs Regularly

```bash
# Last 50 logs
docker compose logs --tail=50

# Follow live logs
docker compose logs -f

# Filter by error
docker compose logs | grep ERROR

# Filter by user
docker compose logs | grep "abc-123"

# Export logs
docker compose logs --since 24h > /tmp/scraper-logs.txt
```

### 2. Query Database Logs

```sql
-- Recent errors
SELECT * FROM notification_logs
WHERE level = 'error'
ORDER BY created_at DESC
LIMIT 20;

-- User-specific logs
SELECT * FROM notification_logs
WHERE context->>'userId' = 'abc-123'
ORDER BY created_at DESC;

-- Sync failures
SELECT
  user_id,
  status,
  error_message,
  started_at
FROM tribunal_sync_log
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### 3. Set Up Alerts (Optional)

Use Supabase Database Webhooks or cron job:

```bash
# Check for errors every 5 minutes
*/5 * * * * psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM notification_logs
  WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '5 minutes'
" | mail -s "Scraper Errors" your@email.com
```

---

## Common Error Patterns & Solutions

| Error | Likely Cause | How to Fix |
|-------|--------------|------------|
| `Timeout waiting for selector` | Website HTML changed | Update selector in scraper code |
| `Invalid phone number` | User entered wrong format | Validate phone in frontend |
| `Quota exceeded` | Storage full | Upgrade plan or delete old files |
| `vault_get_secret failed` | Vault IDs corrupted | Re-save credentials in UI |
| `Login failed` | Credentials wrong/expired | User needs to re-validate |
| `Browser crashed` | Out of memory | Increase container memory limit |
| `AJAX call failed` | Website API changed | Update PDF downloader logic |
| `Rate limit` | Too many requests | Add delay between operations |

---

## Testing Changes Safely

### 1. Test in Docker Locally First

```bash
# Build with your changes
docker compose build

# Start container
docker compose up -d

# Run manual test
docker compose exec scraper npm run sync

# Check logs for errors
docker compose logs --tail=100
```

### 2. Test with Single User

```sql
-- Temporarily disable other users
UPDATE tribunal_credentials
SET status = 'inactive'
WHERE user_id != 'test-user-id';

-- Run sync (will only process test user)

-- Re-enable after testing
UPDATE tribunal_credentials
SET status = 'active'
WHERE status = 'inactive';
```

### 3. Gradual Rollout on Hetzner

```bash
# Deploy changes
git push && ssh hetzner "cd /opt/monitor_judicial/hetzner && git pull && docker compose up -d --build"

# Monitor for 1 hour
docker compose logs -f

# If errors, rollback immediately
git revert HEAD && git push
ssh hetzner "cd /opt/monitor_judicial/hetzner && git pull && docker compose up -d --build"
```

---

## Priority Improvements

Implement these in order for maximum debugging benefit:

### Week 1: Critical Fixes
- [ ] Add context to all error logs (userId, expediente, step)
- [ ] Log silent failures (selector fallbacks, cleanup errors)
- [ ] Fix log loss issue in notification-logger.ts
- [ ] Add screenshots on scraper errors

### Week 2: High Value
- [ ] Add step tracking throughout sync pipeline
- [ ] Add timing metrics (duration per operation)
- [ ] Add retry logging with attempt count
- [ ] Improve PDF download error messages

### Week 3: Nice to Have
- [ ] Add correlation IDs for request tracing
- [ ] Add performance warnings (slow operations)
- [ ] Add log sampling for high-volume events
- [ ] Set up error alerting

---

## Quick Reference

**View logs:**
```bash
docker compose logs -f --tail=100
```

**Rebuild after changes:**
```bash
docker compose up -d --build
```

**Test manually:**
```bash
docker compose exec scraper npm run sync
```

**Check health:**
```bash
curl http://localhost:3001/health
```

**Access container:**
```bash
docker compose exec scraper bash
```

**View database logs:**
```sql
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 50;
```

**Rollback deployment:**
```bash
git checkout HEAD~1
docker compose up -d --build
```

---

## Summary

**Current Grade: C+** (Works but hard to debug)

**After Quick Fixes: B** (Can debug most issues)

**After All Improvements: A-** (Production-ready with excellent debugging)

The scraper works, but when it breaks, you're flying blind. Implementing these improvements will save you HOURS of debugging time in production.

Start with Week 1 critical fixes, then gradually add the rest.
