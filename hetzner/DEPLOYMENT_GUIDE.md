# Monitor Judicial - Production Deployment Guide

Complete step-by-step guide for deploying to Hetzner production server.

## 📋 Prerequisites

### Server Requirements

- **Provider**: Hetzner Cloud or Dedicated
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 16GB
- **CPU**: 4 cores minimum (8 cores recommended)
- **Disk**: 100GB SSD minimum
- **Network**: Public IP address (no ports need to be opened - using Cloudflare Tunnel)

### Local Requirements

- Docker 24+ and Docker Compose 2.20+
- Git
- SSH access to Hetzner server
- Domain name (optional but recommended)

## 🚀 Deployment Steps

### Step 1: Prepare Hetzner Server

```bash
# SSH to server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Create deployment directory
mkdir -p /opt/monitor_judicial
cd /opt/monitor_judicial
```

### Step 2: Clone Repository

```bash
# Clone from GitHub (on Hetzner server)
git clone https://github.com/yourusername/monitor_judicial.git .

# Navigate to hetzner directory
cd hetzner

# Verify structure
ls -la
# Should see: postgres/, rag_api_server/, tribunal_scraper/, docker-compose.production.yml
```

### Step 3: Restore PostgreSQL Data

The postgres volume backup contains 91,634 tesis with embeddings.

```bash
# Navigate to postgres directory
cd postgres

# Verify backup exists
ls -lh data-backup/postgres-data-backup.tar.gz
# Should show ~2.8GB file

# Run restore script
./restore-volume.sh

# Expected output:
# ✅ Restore complete!
# Wait ~2-3 minutes for extraction
```

### Step 4: Configure Environment Variables

#### 4.1 RAG API Server

```bash
cd /opt/monitor_judicial/hetzner/rag_api_server
cp .env.example .env
nano .env
```

**Required changes**:
```bash
# Generate secure API key
RAG_API_KEY=$(openssl rand -hex 32)
echo "RAG_API_KEY=$RAG_API_KEY" >> .env

# Add your OpenAI API key
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Add Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Set production frontend URL
FRONTEND_URL=https://your-vercel-app.vercel.app

# Database password (if changed from default)
TESIS_DB_PASSWORD=postgres  # Change in production!
AGENT_DB_PASSWORD=postgres  # Change in production!
```

**Save RAG_API_KEY** for Step 6 (Vercel configuration).

#### 4.2 Tribunal Scraper

```bash
cd /opt/monitor_judicial/hetzner/tribunal_scraper
cp .env.example .env
nano .env
```

**Required changes**:
```bash
# Add Supabase credentials (same as RAG API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database password (match RAG API)
TESIS_DB_PASSWORD=postgres  # Change in production!

# Optional: WhatsApp integration
WHATSAPP_ENABLED=false
```

#### 4.3 PostgreSQL (Optional)

```bash
cd /opt/monitor_judicial/hetzner
nano docker-compose.production.yml
```

**Change default passwords** (lines 30, 80-81):
```yaml
# Line 30 - Postgres password
POSTGRES_PASSWORD: your-secure-password-here

# Lines 80-81 - pgAdmin credentials
PGADMIN_DEFAULT_EMAIL: admin@yourdomain.com
PGADMIN_DEFAULT_PASSWORD: your-secure-password-here
```

### Step 5: Start Services

```bash
cd /opt/monitor_judicial/hetzner

# Pull latest images
docker compose -f docker-compose.production.yml pull

# Build and start all services
docker compose -f docker-compose.production.yml up -d --build

# Wait ~30 seconds for health checks
sleep 30

# Check status
docker compose -f docker-compose.production.yml ps
```

**Expected output**:
```
NAME                  STATUS         PORTS
legal-rag-postgres    Up (healthy)   0.0.0.0:5432->5432/tcp
legal-rag-pgadmin     Up (healthy)   0.0.0.0:5050->80/tcp
tribunal-scraper      Up (healthy)   0.0.0.0:3001->3001/tcp
rag-api-server        Up (healthy)   0.0.0.0:3002->3002/tcp
```

### Step 6: Verify Deployment

#### 6.1 PostgreSQL

```bash
# Check tesis count
docker exec legal-rag-postgres psql -U postgres -d legal_rag -c "SELECT COUNT(*) FROM tesis;"

# Expected output:
#  count
# -------
#  91634
```

#### 6.2 RAG API Server

```bash
# Health check
curl http://localhost:3002/health

# Expected: {"status":"ok","database":"connected"}

# Test chat endpoint (replace with real user UUID)
curl -X POST http://localhost:3002/chat \
  -H "Authorization: Bearer your-rag-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"¿Qué es amparo indirecto?"}],
    "userId": "your-user-uuid-from-supabase"
  }'

# Expected: SSE stream with legal research
```

#### 6.3 Tribunal Scraper

```bash
# Health check
curl http://localhost:3001/health

# Expected: {"status":"ok","database":"connected"}
```

### Step 7: Configure Cloudflare Tunnel (Production)

Cloudflare Tunnel provides secure access to your services without opening ports or managing SSL certificates.

#### 7.1 Install cloudflared

```bash
# Download and install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

#### 7.2 Login to Cloudflare

```bash
# This will open a browser window for authentication
cloudflared tunnel login
```

This creates a certificate file at `~/.cloudflared/cert.pem`.

#### 7.3 Create Tunnel

```bash
# Create a new tunnel named "monitor-judicial"
cloudflared tunnel create monitor-judicial

# Note the Tunnel ID from the output
# Example: Created tunnel monitor-judicial with id abc123def456
```

#### 7.4 Configure Tunnel

```bash
# Create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

**Add configuration**:
```yaml
tunnel: monitor-judicial  # Your tunnel name
credentials-file: /root/.cloudflared/abc123def456.json  # Replace with your tunnel ID

ingress:
  # RAG API Server (main service)
  - hostname: rag-api.yourdomain.com
    service: http://localhost:3002
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s

  # Optional: Tribunal Scraper (only if external access needed)
  - hostname: scraper.yourdomain.com
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true

  # Optional: pgAdmin (only for database management)
  - hostname: pgadmin.yourdomain.com
    service: http://localhost:5050
    originRequest:
      noTLSVerify: true

  # Catch-all rule (required)
  - service: http_status:404
```

#### 7.5 Configure DNS

```bash
# Route your subdomain to the tunnel
cloudflared tunnel route dns monitor-judicial rag-api.yourdomain.com

# Optional: Add other services
cloudflared tunnel route dns monitor-judicial scraper.yourdomain.com
cloudflared tunnel route dns monitor-judicial pgadmin.yourdomain.com
```

#### 7.6 Install as System Service

```bash
# Install the tunnel as a system service
cloudflared service install

# Start the service
systemctl start cloudflared
systemctl enable cloudflared

# Check status
systemctl status cloudflared
```

#### 7.7 Verify External Access

```bash
# From your local machine (wait ~30 seconds for DNS propagation)
curl https://rag-api.yourdomain.com/health

# Expected: {"status":"ok","database":"connected"}

# Test with browser
open https://rag-api.yourdomain.com/health
```

**Benefits of Cloudflare Tunnel**:
- ✅ No ports need to be opened (more secure)
- ✅ Automatic SSL/TLS (no certificate management)
- ✅ DDoS protection included
- ✅ Free tier available
- ✅ Easy configuration

### Step 8: Update Vercel App

Update your Next.js app on Vercel to use the production RAG API.

#### 8.1 Add Environment Variables to Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables:

```
RAG_API_URL=https://rag-api.yourdomain.com
RAG_API_KEY=your-rag-api-key-from-step-4
```

#### 8.2 Redeploy Vercel App

```bash
# Trigger redeployment (environment variables auto-apply)
git commit --allow-empty -m "Update to use production RAG API"
git push origin main
```

#### 8.3 Test End-to-End

Open your Vercel app and test the chat interface. It should now use the Hetzner RAG API.

### Step 9: Configure Monitoring (Optional)

#### 9.1 View Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f rag-api
```

#### 9.2 Resource Monitoring

```bash
# Real-time stats
docker stats

# Disk usage
docker system df
```

#### 9.3 Set Up Automated Backups

```bash
# Create backup script
cat > /opt/monitor_judicial/hetzner/backup-daily.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/monitor_judicial"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR

# Backup postgres volume
docker run --rm \
  -v legal-rag-postgres-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/postgres-$DATE.tar.gz -C /data .

# Keep only last 7 days
find $BACKUP_DIR -name "postgres-*.tar.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/postgres-$DATE.tar.gz"
EOF

chmod +x /opt/monitor_judicial/hetzner/backup-daily.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/monitor_judicial/hetzner/backup-daily.sh") | crontab -
```

## 🔐 Security Checklist

- [ ] Changed default PostgreSQL password
- [ ] Changed pgAdmin default credentials
- [ ] Generated secure RAG_API_KEY (32+ characters)
- [ ] Restricted CORS to production frontend URL
- [ ] Configured firewall (UFW - only SSH port needed)
- [ ] Configured Cloudflare Tunnel (automatic SSL/TLS)
- [ ] Restricted pgAdmin access (keep internal-only recommended)
- [ ] Set up automated backups
- [ ] Disabled root SSH access (recommended)
- [ ] Enabled fail2ban (recommended)

### Firewall Configuration

```bash
# Install UFW
apt install ufw -y

# Allow SSH (IMPORTANT - don't lock yourself out!)
ufw allow 22/tcp

# Note: No need to open HTTP/HTTPS ports with Cloudflare Tunnel
# All traffic goes through the tunnel

# Enable firewall
ufw enable

# Check status
ufw status
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose -f docker-compose.production.yml logs

# Common issues:
# - Port conflicts → Check if ports 5432, 3001, 3002, 5050 are available
# - Memory limits → Increase swap or reduce container limits
# - Volume permissions → Check ownership of volume mount points
```

### Database Connection Errors

```bash
# Verify postgres is running
docker compose -f docker-compose.production.yml ps postgres

# Check postgres logs
docker compose -f docker-compose.production.yml logs postgres

# Test connection manually
docker exec -it legal-rag-postgres psql -U postgres -d legal_rag
```

### RAG API 500 Errors

```bash
# Check logs
docker compose -f docker-compose.production.yml logs rag-api

# Common issues:
# - OpenAI API key invalid → Check .env
# - Database connection failed → Verify TESIS_DB_HOST=legal-rag-postgres
# - Out of memory → Increase container memory limit
```

### Cloudflare Tunnel Issues

```bash
# Check tunnel status
systemctl status cloudflared

# View tunnel logs
journalctl -u cloudflared -f

# Restart tunnel
systemctl restart cloudflared

# Test tunnel connectivity
cloudflared tunnel info monitor-judicial

# Common issues:
# - DNS not propagated → Wait 5-10 minutes, clear DNS cache
# - Service not accessible → Check config.yml ingress rules
# - Tunnel offline → Verify credentials-file path in config.yml
```

## 🔄 Updating Services

### Update Code

```bash
cd /opt/monitor_judicial
git pull origin main
cd hetzner
docker compose -f docker-compose.production.yml up -d --build
```

### Update Docker Images

```bash
# Pull latest base images
docker compose -f docker-compose.production.yml pull

# Restart services
docker compose -f docker-compose.production.yml up -d
```

## 📊 Performance Tuning

### PostgreSQL

The default `postgres/postgresql.conf` is already tuned for 16GB RAM server:

```ini
# Optimized for 16GB RAM server with 8GB allocated to Postgres
shared_buffers = 2GB                    # 25% of allocated memory
effective_cache_size = 6GB              # 75% of allocated memory
maintenance_work_mem = 512MB            # For CREATE INDEX operations
work_mem = 64MB                         # Per-query memory
```

If you need to adjust for different RAM allocation, edit `postgres/postgresql.conf`.

Then restart postgres:
```bash
docker compose -f docker-compose.production.yml restart postgres
```

### RAG API Server

Increase Node.js memory limit if needed:

Edit `rag_api_server/Dockerfile`:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

Rebuild:
```bash
docker compose -f docker-compose.production.yml up -d --build rag-api
```

## 📝 Maintenance Tasks

### Weekly

- [ ] Check disk usage (`df -h`)
- [ ] Review logs for errors
- [ ] Verify all services healthy
- [ ] Test chat endpoint

### Monthly

- [ ] Update system packages (`apt update && apt upgrade`)
- [ ] Update Docker images
- [ ] Review backup size and retention
- [ ] Verify Cloudflare Tunnel is running (`systemctl status cloudflared`)

### Quarterly

- [ ] Security audit
- [ ] Performance review
- [ ] Cost analysis
- [ ] Documentation updates

## 🆘 Rollback Procedure

If deployment fails:

```bash
# Stop all services
docker compose -f docker-compose.production.yml down

# Restore previous postgres backup
cd postgres
./restore-volume.sh data-backup/postgres-backup-YYYYMMDD.tar.gz

# Revert code
git reset --hard origin/main~1

# Restart services
cd ..
docker compose -f docker-compose.production.yml up -d
```

## ✅ Deployment Complete!

Your Monitor Judicial system is now running on Hetzner:

- **RAG API**: https://rag-api.yourdomain.com
- **Tribunal Scraper**: http://localhost:3001 (internal)
- **pgAdmin**: https://pgadmin.yourdomain.com (optional)
- **PostgreSQL**: localhost:5432 (internal)

Next steps:
1. Monitor logs for 24 hours
2. Test all features from Vercel app
3. Set up monitoring/alerting
4. Document any custom configuration

---

**Questions?** Check the main README.md or create an issue on GitHub.
