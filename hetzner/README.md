# Hetzner Tribunal Services

This directory contains services that run **only on Hetzner**, not on Vercel:
1. **Validation Server** - Real-time credential validation with SSE
2. **Sync Script** - Cron job for document synchronization

## Setup

```bash
cd hetzner
npm install
```

## Environment Variables

Create a `.env` file in this directory:

```env
# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# WhatsApp Notifications
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

### 1. Validation Server (Real-time SSE)

Start the validation server:

```bash
cd hetzner
npm run dev
```

The server runs on port 3001 and provides:
- `GET /health` - Health check endpoint
- `POST /validate-credentials` - SSE endpoint for credential validation

**How it works:**
- When users save credentials in the frontend settings page, the backend calls this endpoint
- The server validates credentials, scrapes current documents, and establishes a date baseline
- Progress updates are streamed via Server-Sent Events (SSE)
- Returns `last_document_date` to track new documents going forward

**Production deployment:**
```bash
# Use a process manager like PM2
pm2 start server.js --name tribunal-validation
pm2 save
pm2 startup
```

### 2. Sync Script (Cron Job)

Manual run:

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
- **Hetzner**: Runs validation server (Express) + sync script (cron)
- **Supabase**: Stores credentials (Vault), documents, and sync logs

### Validation Flow (SSE)
1. User enters credentials in frontend
2. Frontend calls Vercel API `/api/tribunal/credentials`
3. Vercel API calls Hetzner validation server via HTTP POST
4. Hetzner server streams progress via SSE:
   - Launches Puppeteer browser
   - Validates credentials by logging in
   - Navigates to Documentos page
   - Scrapes current documents
   - Finds latest document date
5. Returns validation result with `last_document_date`
6. Vercel stores credentials in Vault with date baseline

### Sync Flow (Cron)
1. Cron triggers sync script every 2 hours
2. Fetches active users from `tribunal_credentials`
3. Retrieves credentials from Vault
4. Runs Puppeteer to scrape documents
5. Filters new documents (date > `last_document_date`)
6. Downloads PDFs to Supabase Storage
7. Generates AI summaries
8. Sends WhatsApp alerts
9. Updates `last_document_date` watermark

## Logs

Check sync logs:

```bash
tail -f /var/log/tribunal-sync.log
```

Or query Supabase:

```sql
SELECT * FROM tribunal_sync_log ORDER BY started_at DESC LIMIT 10;
```
