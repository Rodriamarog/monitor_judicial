# Tribunal Scraper - Docker Deployment Guide

Simple guide to deploy the scraper using Docker on your Hetzner server.

## Quick Start (On Hetzner Server)

### 1. Install Docker (if not installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 2. Deploy the Scraper

```bash
# Navigate to the hetzner directory
cd /path/to/monitor_judicial/hetzner

# Make sure .env file exists with your credentials
ls .env

# Build the Docker image
docker compose build

# Start the container
docker compose up -d

# Check if running
docker compose ps
```

Expected output:
```
NAME                 STATUS          PORTS
tribunal-scraper     Up 20 seconds   0.0.0.0:3001->3001/tcp
```

### 3. Verify It Works

```bash
# Check health endpoint
curl http://localhost:3001/health

# Should return: {"status":"ok",...}

# View logs
docker compose logs -f
```

## Common Commands

```bash
# View live logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update after code changes
docker compose build
docker compose up -d

# Run sync manually
docker compose exec scraper npm run sync
```

## Cron Job Setup

Run sync every 2 hours:

```bash
# Edit crontab
crontab -e

# Add this line:
0 */2 * * * cd /path/to/monitor_judicial/hetzner && docker compose exec -T scraper npm run sync >> /var/log/tribunal-sync.log 2>&1
```

## Troubleshooting

### Check logs
```bash
docker compose logs --tail=100
```

### Container won't start
```bash
docker compose down
docker compose up -d
docker compose logs
```

### Port already in use
```bash
sudo lsof -i :3001
# Kill the process using the port, then restart
```

## What's Running

- **Port 3001**: Validation server (SSE endpoint for credential testing)
- **Cron job**: Runs sync script every 2 hours
- **Browser**: Headless Chromium (inside container)
- **Data**: Stored in Supabase (remote)

## Next Steps

Once deployed:
1. Test the validation endpoint from your Next.js app
2. Verify sync job runs correctly
3. Monitor logs for the first few days
4. Set up monitoring/alerts (optional)
