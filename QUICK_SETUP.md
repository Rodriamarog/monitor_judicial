# Quick Setup Guide for GitHub Actions

Follow these simple steps to complete the GitHub Actions setup:

## Step 1: Add GitHub Secrets (2 minutes)

1. **Open GitHub Secrets Page:**
   - Click this link: https://github.com/Rodriamarog/monitor_judicial/settings/secrets/actions
   - Or navigate to: Your Repo → Settings → Secrets and variables → Actions

2. **Add First Secret:**
   - Click the green **"New repository secret"** button
   - Name: `VERCEL_DEPLOYMENT_URL`
   - Secret: `https://monitor-judicial.vercel.app`
   - Click **"Add secret"**

3. **Add Second Secret:**
   - Click **"New repository secret"** again
   - Name: `CRON_SECRET`
   - Secret: `dev-test-secret-12345`
   - Click **"Add secret"**

## Step 2: Verify Workflow is Active

1. **Go to Actions Tab:**
   - Click this link: https://github.com/Rodriamarog/monitor_judicial/actions
   - You should see the "Smart Bulletin Scraper" workflow

2. **Run a Manual Test:**
   - Click on "Smart Bulletin Scraper"
   - Click the **"Run workflow"** button (on the right side)
   - Leave "Also check tomorrow bulletin" as **false**
   - Click the green **"Run workflow"** button
   - Wait 30-60 seconds and refresh
   - Click on the workflow run to see logs
   - ✅ = Success!

## Step 3: Check Automated Schedule

The workflow will automatically run:
- **Monday-Friday only** (skips weekends)
- **9am Tijuana time** (16:00 UTC)
- **2pm Tijuana time** (21:00 UTC)
- **8pm Tijuana time** (03:00 UTC next day)

Check the Actions tab tomorrow to see the automated runs!

## Troubleshooting

### "Invalid workflow file"
- The workflow file is already committed, so this shouldn't happen
- If it does, check `.github/workflows/scraper.yml` exists

### "Secret not found" error in workflow logs
- Go back to Step 1 and make sure you added both secrets
- Check the secret names are EXACTLY: `VERCEL_DEPLOYMENT_URL` and `CRON_SECRET`

### Workflow runs but returns "401 Unauthorized"
- The CRON_SECRET doesn't match
- Make sure you used: `dev-test-secret-12345`

### Workflow returns "0 entries found"
- This is normal on weekends (courts closed)
- This is normal if no bulletins were published
- Check during business hours Monday-Friday

## That's it!

Your automated scraper is now running. It will check for bulletins 3 times a day automatically, and users will receive alerts when their cases appear in the bulletins.

You can monitor all workflow runs at:
https://github.com/Rodriamarog/monitor_judicial/actions
