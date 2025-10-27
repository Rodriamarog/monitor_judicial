# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions to run the smart scraper instead of Vercel Cron.

## Why GitHub Actions?

- **Free:** 2,000 minutes/month on free tier
- **Multiple checks:** Run 3 times/day vs Vercel's 1/day limit
- **Smart scheduling:** Skip weekends, check for next-day bulletins
- **Flexible:** Easy to adjust timing

## Schedule

The scraper runs **Monday-Friday only** at:

1. **9am Tijuana** (16:00 UTC) - Check yesterday + today's bulletins
2. **2pm Tijuana** (21:00 UTC) - Check today's bulletin
3. **8pm Tijuana** (03:00 UTC) - Check tomorrow's bulletin (published early)

## Setup Steps

### 1. Add GitHub Secrets

You have two options for setting up secrets:

#### Option A: Automated Setup (Recommended)

Run the provided setup script:

```bash
# Install GitHub CLI (if not already installed)
sudo apt install gh

# Authenticate with GitHub
gh auth login

# Run the automated setup script
./setup-github-secrets.sh
```

The script will automatically configure:
- `VERCEL_DEPLOYMENT_URL` = `https://monitor-judicial.vercel.app`
- `CRON_SECRET` = Your current cron secret from `.env.local`

#### Option B: Manual Setup

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Click **"New repository secret"** and add these two secrets:

**Secret 1: `VERCEL_DEPLOYMENT_URL`**
- **Value:** Your production Vercel URL
- **Example:** `https://monitor-judicial.vercel.app`
- Find it in: Vercel Dashboard → Your Project → Domains → Production domain

**Secret 2: `CRON_SECRET`**
- **Value:** Same as your `CRON_SECRET` environment variable
- **Example:** `dev-test-secret-12345` (use your actual secret!)
- Find it in: `.env.local` file or Vercel → Settings → Environment Variables

### 2. Verify Workflow File

The workflow file is already created at `.github/workflows/scraper.yml`

Check that it's committed to your repository:
```bash
git add .github/workflows/scraper.yml
git commit -m "Add GitHub Actions smart scraper workflow"
git push
```

### 3. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. If prompted, click **"I understand my workflows, go ahead and enable them"**

### 4. Verify Setup

Run the verification script to check everything is configured correctly:

```bash
./verify-github-actions.sh
```

This will check:
- ✅ Workflow file exists
- ✅ GitHub CLI available (optional)
- 📊 Workflow status
- 📋 Recent workflow runs

### 5. Test the Workflow

**Manual Test:**
1. Go to **Actions** tab
2. Click **"Smart Bulletin Scraper"** workflow
3. Click **"Run workflow"** dropdown
4. Leave "Also check tomorrow bulletin" as **false** (or set to **true** to test tomorrow check)
5. Click green **"Run workflow"** button

**Check Results:**
- Wait 30-60 seconds
- Refresh the page
- Click on the workflow run to see logs
- Green checkmark = Success ✅
- Red X = Failed ❌ (check logs for errors)

### 6. Monitor Runs

**View Past Runs:**
- Go to **Actions** tab
- See history of all automated runs
- Click any run to see detailed logs

**Check Cron Schedule:**
The workflow will automatically run at scheduled times. Check the **Actions** tab to verify runs are happening as expected.

## Troubleshooting

### Workflow not running?

1. **Check GitHub Actions is enabled:** Repository → Settings → Actions → General
2. **Verify secrets are set:** Settings → Secrets and variables → Actions
3. **Check workflow syntax:** `.github/workflows/scraper.yml` for YAML errors

### Getting 401 Unauthorized?

- Your `CRON_SECRET` in GitHub secrets doesn't match the one in Vercel
- Fix: Update the GitHub secret with the correct value from `.env.local`

### Getting 404 Not Found?

- Your `VERCEL_DEPLOYMENT_URL` is incorrect
- Fix: Use your actual production domain (no trailing slash)

### Scraper returns 0 entries?

- This is normal on weekends (courts closed)
- This is normal if checking tomorrow's bulletin before it's published
- Check Vercel logs to see if bulletins were actually published

## Cost

**GitHub Actions Free Tier:**
- 2,000 minutes/month
- Each scraper run takes ~30-60 seconds
- 3 runs/day × 5 days/week = 15 runs/week = 60 runs/month
- Total: ~60 minutes/month = **3% of free quota** ✅

You'll never hit the limit!

## Next Steps

Once GitHub Actions is working, you can:
- Adjust schedule in `.github/workflows/scraper.yml`
- Add more checks during the day
- Monitor performance in Actions tab
- Set up notifications for failed runs
