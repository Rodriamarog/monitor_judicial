# Docker Container - Usage Guide

A practical guide for running and testing the Tribunal Scraper in Docker.

## Table of Contents
- [What is Docker?](#what-is-docker)
- [One-Time Setup](#one-time-setup)
- [Daily Usage](#daily-usage)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

---

## What is Docker?

Think of Docker like a virtual environment that packages your app with everything it needs to run:

- **Docker Image** = A frozen snapshot of your app (like a .exe installer)
- **Docker Container** = A running instance of that image (like an opened program)

**Key concept:** Once you build an image, you DON'T need to rebuild it unless you change the code.

---

## One-Time Setup

### 1. Make sure Docker is installed

```bash
docker --version
docker compose version
```

Should show versions like `Docker version 28.4.0` and `Docker Compose version v2.39.2`

If not installed:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 2. Navigate to the hetzner directory

```bash
cd /home/rodrigo/code/monitor_judicial/hetzner
```

### 3. Build the Docker image (first time only)

```bash
docker compose build
```

**This takes 2-3 minutes** (downloads base image + installs dependencies)

Output should end with: `✓ hetzner-scraper  Built`

---

## Daily Usage

### Start the Container

```bash
cd /home/rodrigo/code/monitor_judicial/hetzner
docker compose up -d
```

- `-d` = "detached mode" (runs in background)
- Takes ~5 seconds to start
- Container will auto-restart if it crashes

**Check it's running:**
```bash
docker compose ps
```

Expected output:
```
NAME               STATUS          PORTS
tribunal-scraper   Up 2 minutes    0.0.0.0:3001->3001/tcp
```

### Test the Health Endpoint

```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","service":"hetzner-validation-server",...}`

### Run the Scraper Manually

```bash
docker compose exec scraper npm run sync
```

This will:
1. Query Supabase for active users
2. Retrieve credentials from Vault
3. Scrape Tribunal Electrónico
4. Process documents
5. Send WhatsApp alerts (if new documents found)

**What you'll see:**
```
[INFO] Starting Tribunal Electrónico sync job
[INFO] Found 1 active users to sync
[Scraper] Launching browser...
[Scraper] Login successful!
[Scraper] Found 20 documents
✓ User sync completed: 0 new, 0 processed
```

### View Logs (Live)

```bash
docker compose logs -f
```

- Press `Ctrl+C` to stop viewing logs (container keeps running)

### Stop the Container

```bash
docker compose down
```

This stops and removes the container (but keeps the image).

---

## Common Scenarios

### After Restarting Your Computer

**Q: Do I need to rebuild?**
**A: NO!** Just start the container:

```bash
cd /home/rodrigo/code/monitor_judicial/hetzner
docker compose up -d
```

The image is still there. Docker images persist across reboots.

### After Changing Code

**Q: Do I need to rebuild?**
**A: YES!** Changes to `.ts` or `.js` files require rebuild:

```bash
docker compose down           # Stop current container
docker compose build          # Rebuild with new code (2-3 min)
docker compose up -d          # Start updated container
```

**Shortcut:**
```bash
docker compose up -d --build  # Rebuild + restart in one command
```

### After Changing Environment Variables

**Q: Do I need to rebuild?**
**A: NO!** Just restart:

```bash
# Edit .env file
nano .env

# Restart to pick up new env vars
docker compose down
docker compose up -d
```

### Check Resource Usage

```bash
docker stats tribunal-scraper
```

Shows real-time CPU, RAM, and network usage. Press `Ctrl+C` to exit.

### Access the Container Shell

Want to poke around inside the container?

```bash
docker compose exec scraper bash
```

You're now inside the container! Try:
```bash
ls -la                    # List files
whoami                    # Check user (should be root)
which chromium           # Check Chrome location
npm list                 # See installed packages
exit                     # Leave container
```

---

## Complete Test Workflow

Here's a full test from scratch:

```bash
# 1. Navigate to directory
cd /home/rodrigo/code/monitor_judicial/hetzner

# 2. Build image (first time or after code changes)
docker compose build

# 3. Start container
docker compose up -d

# 4. Wait a few seconds
sleep 3

# 5. Check health
curl http://localhost:3001/health

# 6. Run scraper test
docker compose exec scraper npm run sync

# 7. View logs
docker compose logs --tail=50

# 8. Stop container
docker compose down
```

---

## Understanding docker-compose.yml

This file tells Docker HOW to run your container:

```yaml
services:
  scraper:                           # Service name
    build: ..                        # Where to find Dockerfile
    container_name: tribunal-scraper # Container name
    restart: unless-stopped          # Auto-restart on crash

    ports:
      - "3001:3001"                  # Host:Container port mapping

    env_file:
      - .env                         # Load environment variables

    environment:
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

    shm_size: 2gb                    # Shared memory for Chrome
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Build image | `docker compose build` |
| Start container | `docker compose up -d` |
| Stop container | `docker compose down` |
| View logs (live) | `docker compose logs -f` |
| View logs (last 50 lines) | `docker compose logs --tail=50` |
| Run sync manually | `docker compose exec scraper npm run sync` |
| Check container status | `docker compose ps` |
| Restart container | `docker compose restart` |
| Rebuild + restart | `docker compose up -d --build` |
| Access container shell | `docker compose exec scraper bash` |
| Check resource usage | `docker stats tribunal-scraper` |
| Remove everything | `docker compose down -v` |

---

## Troubleshooting

### Container won't start

```bash
# Check what went wrong
docker compose logs

# Common fix: port already in use
sudo lsof -i :3001
# Kill the process using port 3001, then retry
```

### "No active users to sync"

The user status was marked as `failed` during testing. Reset it:

```bash
cd /home/rodrigo/code/monitor_judicial/hetzner
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.from('tribunal_credentials')
  .update({ status: 'active', retry_count: 0 })
  .eq('email', 'jevaristoz@gmail.com')
  .select()
  .then(({ data }) => console.log('✓ User reset:', data[0]));
"
```

### Build fails

```bash
# Clear Docker cache and rebuild from scratch
docker compose build --no-cache
```

### Chrome/Puppeteer errors

Make sure `headless: true` in `lib/tribunal/scraper-runner.ts`:
```typescript
browser = await puppeteer.launch({
  headless: true,  // Must be true in Docker
  ...
});
```

### Out of disk space

```bash
# Remove old unused images
docker system prune -a

# Warning: this removes ALL unused Docker images
```

---

## What Happens on Hetzner?

On Hetzner, you'll run the same commands:

```bash
# One-time setup
cd /opt/monitor_judicial/hetzner
docker compose build
docker compose up -d

# Set up cron job for automatic syncing
crontab -e
# Add: 0 */2 * * * cd /opt/monitor_judicial/hetzner && docker compose exec -T scraper npm run sync
```

The container will:
- Auto-start on server reboot (if you enable Docker to start on boot)
- Auto-restart if it crashes (`restart: unless-stopped`)
- Run sync every 2 hours via cron

---

## Tips

1. **Always run commands from the hetzner directory** (`cd /home/rodrigo/code/monitor_judicial/hetzner`)
2. **Use `-d` flag** when starting containers (runs in background)
3. **Check logs first** when something doesn't work (`docker compose logs`)
4. **Rebuild after code changes**, not after env changes
5. **Use `docker compose ps`** to see if container is actually running

---

## Next Steps

Once comfortable with local testing:
1. Deploy to Hetzner server
2. Set up cron job for automatic syncing
3. Monitor logs for first few days
4. Set up alerts for failures

See `DEPLOYMENT.md` for Hetzner deployment guide.
