# Bulletin Scraper Setup

## Overview

The scraper runs automatically via Vercel Cron every 30 minutes during business hours (6am-2pm Tijuana time). It:

1. Downloads bulletins from PJBC for all 6 sources
2. Parses case entries using cheerio
3. Stores entries in `bulletin_entries` table
4. Finds matches with `monitored_cases`
5. Creates `alerts` for users

## Files Created

- **`lib/scraper.ts`** - Core scraping logic (downloads & parses bulletins)
- **`lib/matcher.ts`** - Matching logic (finds monitored cases in bulletins)
- **`app/api/cron/scrape/route.ts`** - Cron API endpoint
- **`vercel.json`** - Cron configuration

## Setup Steps

### 1. Get Supabase Credentials

```bash
# From your Supabase project dashboard:
# Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://mnotrrzjswisbwkgbyow.supabase.co

# Settings → API → Project API keys → anon public
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Settings → API → Project API keys → service_role (secret!)
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Generate Cron Secret

```bash
# Generate a random secret for cron authentication
openssl rand -base64 32
```

### 3. Create `.env.local` File

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual values
```

### 4. Test Locally

```bash
# Start development server
npm run dev

# Test the scraper manually (in another terminal)
curl http://localhost:3000/api/cron/scrape \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "date": "2025-10-24",
  "scraping": {
    "sources_scraped": 6,
    "sources_failed": 0,
    "total_entries": 4223
  },
  "matching": {
    "matches_found": 0,
    "alerts_created": 0
  }
}
```

### 5. Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Add scraper cron job"
git push

# Vercel will auto-deploy
# Add environment variables in Vercel dashboard:
# Project Settings → Environment Variables
```

Add these environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

### 6. Verify Cron Schedule

The cron runs every 30 minutes from 6am-2pm Tijuana time:
- `6:00am, 6:30am, 7:00am, 7:30am, ..., 1:30pm, 2:00pm`

Vercel cron syntax: `*/30 6-14 * * *`
- `*/30` = every 30 minutes
- `6-14` = hours 6-14 (6am-2pm UTC)
- Note: Adjust for timezone if needed

Check cron logs in Vercel dashboard:
- Project → Deployments → Functions → Cron Logs

## How It Works

### Scraping Flow

```
1. Cron triggers /api/cron/scrape
2. scrapeAllBulletins(today)
   ├─ For each source (tijuana, mexicali, etc.)
   ├─ Download bulletin HTML
   ├─ Parse with cheerio
   ├─ Extract case entries
   └─ Insert into bulletin_entries table
3. findAndCreateMatches(today)
   ├─ Get all bulletin entries for today
   ├─ Get all monitored cases
   ├─ Match: case_number + juzgado
   └─ Create alerts for matches
4. Return results JSON
```

### Data Flow

```
PJBC Bulletin (HTML)
  ↓ (scraper.ts)
bulletin_entries table
  ↓ (matcher.ts)
monitored_cases table → MATCH → alerts table
  ↓ (future: WhatsApp sender)
User WhatsApp notification
```

## Monitoring

### Check Scrape Logs

```sql
-- Recent scrape attempts
SELECT
  bulletin_date,
  source,
  found,
  entries_count,
  error_message,
  scraped_at
FROM scrape_log
ORDER BY scraped_at DESC
LIMIT 20;
```

### Check Bulletin Entries

```sql
-- Today's entries by source
SELECT
  source,
  COUNT(*) as count
FROM bulletin_entries
WHERE bulletin_date = CURRENT_DATE
GROUP BY source;
```

### Check Matches

```sql
-- Recent alerts created
SELECT
  a.created_at,
  a.matched_value as case_number,
  mc.juzgado,
  up.email as user_email,
  a.whatsapp_sent
FROM alerts a
JOIN monitored_cases mc ON a.monitored_case_id = mc.id
JOIN user_profiles up ON a.user_id = up.id
ORDER BY a.created_at DESC
LIMIT 10;
```

## Troubleshooting

### Scraper Returns 404

- Bulletin not published yet (PJBC publishes around 8-9am)
- Weekend or holiday (no bulletins)
- Check bulletin URL in browser

### No Matches Found

- No users have monitored cases yet
- Case numbers don't match exactly
- Juzgado names don't match exactly

### Timeout Errors

- Increase `maxDuration` in route.ts
- Process sources in parallel (currently sequential)
- Split into separate cron jobs per source

## Next Steps

1. ✅ Scraper built and tested
2. ⏳ WhatsApp notification sender (separate endpoint)
3. ⏳ Frontend dashboard to add monitored cases
4. ⏳ User authentication
