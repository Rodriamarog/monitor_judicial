# Tribunal Electrónico Deployment Guide

## Architecture Overview

The Tribunal Electrónico integration is split between two environments:

### Vercel (Frontend + API)
- UI pages for credentials and documents
- API routes for CRUD operations (no Puppeteer)
- Connects to Supabase for data storage

### Hetzner (Cron Job)
- Runs standalone Node.js script (NOT via HTTP to Vercel)
- Connects directly to Supabase
- Runs Puppeteer automation
- Syncs documents for all users
- Tests credentials and validates

## Deployment Steps

### 1. Vercel Deployment

Already handled! The main app deploys to Vercel automatically.

**Required Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_ALERT_TEMPLATE_SID=your-template-sid
```

Note: `CRON_SECRET` is no longer needed - Hetzner runs the script directly.

### 2. Hetzner Server Setup

#### Install Dependencies

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone/pull the repository
cd /path/to/monitor_judicial

# Install Hetzner-specific dependencies
cd hetzner
npm install

# Install system dependencies for Chromium
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2
```

#### Create Environment File

```bash
# Create .env file in hetzner directory
cd /path/to/monitor_judicial/hetzner
cat > .env << EOF
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_ALERT_TEMPLATE_SID=your-template-sid
EOF
```

#### Test the Script

```bash
cd /path/to/monitor_judicial/hetzner
npm run sync
```

If successful, you should see output like:
```
[Tribunal Sync] Starting sync job...
[Tribunal Sync] Found 2 active users
[Tribunal Sync] Syncing user abc123...
[Tribunal Sync] ✓ User abc123: 3 new docs, 3 processed
```

#### Set Up Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (runs every 2 hours from 7am-7pm Tijuana time)
# Tijuana is UTC-8, so 7am-7pm = 3pm-3am UTC
0 15-3/2 * * * cd /path/to/monitor_judicial/hetzner && npm run sync >> /var/log/tribunal-sync.log 2>&1

# Or use this for testing (every 5 minutes)
*/5 * * * * cd /path/to/monitor_judicial/hetzner && npm run sync >> /var/log/tribunal-sync.log 2>&1
```

## Testing

### Test Credentials Storage (Vercel)

```bash
curl -X POST https://your-app.vercel.app/api/tribunal/credentials \
  -H "Cookie: your-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password",
    "keyFileBase64": "base64-encoded-key-file",
    "cerFileBase64": "base64-encoded-cer-file"
  }'
```

### Test Cron Job (Hetzner)

```bash
# Manual trigger
cd /path/to/monitor_judicial/hetzner
npm run sync

# Check logs
tail -f /var/log/tribunal-sync.log
```

## Monitoring

### Check Sync Logs

```sql
-- In Supabase SQL Editor
SELECT
  user_id,
  status,
  new_documents_found,
  documents_processed,
  documents_failed,
  started_at,
  completed_at,
  error_message
FROM tribunal_sync_log
ORDER BY started_at DESC
LIMIT 20;
```

### Check Credentials Status

```sql
SELECT
  user_id,
  email,
  status,
  last_document_numero,
  last_sync_at,
  validation_error
FROM tribunal_credentials;
```

## Troubleshooting

### Puppeteer Issues on Hetzner

If Chromium fails to launch:

```bash
# Install missing dependencies
sudo apt-get install -y chromium-browser

# Or install all dependencies
npx puppeteer browsers install chrome
```

### Timeout Issues

If syncs timeout, they will automatically fail and log the error. No changes needed - the script can run as long as needed on Hetzner.

### Memory Issues

Monitor memory usage:

```bash
# Check memory during sync
watch -n 1 free -h

# If OOM errors, update the cron job to increase Node.js memory:
0 15-3/2 * * * cd /path/to/monitor_judicial/hetzner && NODE_OPTIONS="--max-old-space-size=4096" npm run sync >> /var/log/tribunal-sync.log 2>&1
```

## Security Notes

1. **Vault Secrets** - Never exposed to frontend
2. **RLS Enabled** - All tables have row-level security
3. **Service Role** - Only used in Hetzner script, never exposed to Vercel/frontend
4. **Credentials** - Hetzner `.env` file should have restricted permissions (chmod 600)

## Maintenance

### Update Code on Hetzner

```bash
cd /path/to/monitor_judicial
git pull

# Update Hetzner dependencies if needed
cd hetzner
npm install
```

### Rotate Service Role Key

If you need to rotate the Supabase service role key:

```bash
# Generate new key in Supabase dashboard
# Update Vercel environment variable
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Update Hetzner .env
cd /path/to/monitor_judicial/hetzner
# Edit .env file with new key
```

## Costs

- **Vercel**: Free tier (no Puppeteer overhead)
- **Hetzner**: Minimal (just cron job execution)
- **Supabase**: Vault requires Pro plan ($25/month)
