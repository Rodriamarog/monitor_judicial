# Hetzner Tribunal Sync

This directory contains scripts that run **only on Hetzner**, not on Vercel.

## Setup

```bash
cd hetzner
npm install
```

## Environment Variables

Create a `.env` file in this directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_ALERT_TEMPLATE_SID=your-template-sid
```

## Install Chromium Dependencies

```bash
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

## Usage

### Manual Run

```bash
cd hetzner
npm run sync
```

### Cron Setup

```bash
# Edit crontab
crontab -e

# Add this line (runs every 2 hours from 7am-7pm Tijuana time)
# Tijuana is UTC-8, so 7am-7pm = 3pm-3am UTC
0 15-3/2 * * * cd /path/to/monitor_judicial/hetzner && npm run sync >> /var/log/tribunal-sync.log 2>&1

# Or for testing (every 5 minutes)
*/5 * * * * cd /path/to/monitor_judicial/hetzner && npm run sync >> /var/log/tribunal-sync.log 2>&1
```

## Architecture

- **Vercel**: Handles UI + API routes (credentials CRUD, document fetching)
- **Hetzner**: Runs this script via cron to sync documents using Puppeteer
- **Supabase**: Stores credentials (Vault), documents, and sync logs

The Hetzner script:
1. Connects directly to Supabase (no HTTP to Vercel)
2. Fetches active users from `tribunal_credentials`
3. Retrieves credentials from Vault
4. Runs Puppeteer to scrape documents
5. Downloads PDFs to Supabase Storage
6. Generates AI summaries
7. Sends WhatsApp alerts
8. Updates sync logs

## Logs

Check sync logs:

```bash
tail -f /var/log/tribunal-sync.log
```

Or query Supabase:

```sql
SELECT * FROM tribunal_sync_log ORDER BY started_at DESC LIMIT 10;
```
