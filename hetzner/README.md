# Monitor Judicial - Hetzner Production Deployment

Complete Docker-based deployment for production server. This folder contains all services required to run the Monitor Judicial legal research system.

## 📋 Services Overview

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **PostgreSQL** | 5432 | Legal database with pgvector (91k+ tesis embeddings) | ✅ Production-ready |
| **pgAdmin** | 5050 | Database management UI (optional) | ✅ Production-ready |
| **Tribunal Scraper** | 3001 | Puppeteer-based web scraper for new tesis | ✅ Production-ready |
| **RAG API Server** | 3002 | AI-powered legal research API | ✅ Production-ready |

## 🏗️ Directory Structure

```
hetzner/
├── docker-compose.production.yml    # Master compose file (all 4 services)
├── README.md                         # This file
│
├── postgres/                         # PostgreSQL + pgvector
│   ├── init/
│   │   └── 01-init-database.sql      # Database initialization script
│   ├── data-backup/
│   │   └── postgres-data-backup.tar.gz  # 2.8GB volume backup (91k tesis)
│   ├── postgresql.conf               # Performance-tuned config
│   └── restore-volume.sh             # Volume restore script
│
├── rag_api_server/                   # RAG API Server (TypeScript)
│   ├── src/
│   │   ├── index.ts                  # Express server
│   │   ├── controllers/              # Chat orchestration
│   │   ├── routes/                   # HTTP endpoints
│   │   ├── ai/                       # Agentic RAG system (11 modules)
│   │   ├── db/                       # PostgreSQL + Supabase clients
│   │   └── middleware/               # Auth + error handling
│   ├── Dockerfile
│   ├── docker-compose.yml            # Standalone testing
│   ├── package.json
│   └── .env.example
│
└── tribunal_scraper/                 # Tribunal Scraper (Puppeteer)
    ├── server.js                     # Express server
    ├── lib/                          # Scraping + sync logic
    ├── Dockerfile
    ├── docker-compose.yml            # Standalone testing
    ├── package.json
    └── .env.example
```

## 🚀 Quick Start

### Prerequisites

- Docker 24+ and Docker Compose 2.20+
- 16GB+ RAM (for all services)
- 50GB+ disk space
- Ubuntu 22.04 LTS or similar

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/monitor_judicial.git
cd monitor_judicial/hetzner
```

### 2. Restore PostgreSQL Data

The postgres volume backup contains 91,634 tesis with embeddings (~2.8GB).

```bash
cd postgres
./restore-volume.sh
# Wait for completion (~2 minutes)
```

### 3. Configure Environment Variables

Create `.env` files for each service:

```bash
# PostgreSQL (optional - defaults work)
# No .env needed, uses docker-compose.production.yml environment

# RAG API Server
cd ../rag_api_server
cp .env.example .env
nano .env  # Fill in:
  # - OPENAI_API_KEY
  # - RAG_API_KEY (generate secure random key)
  # - SUPABASE_* keys
  # - POSTGRES_PASSWORD (if changed from default)

# Tribunal Scraper
cd ../tribunal_scraper
cp .env.example .env
nano .env  # Fill in:
  # - SUPABASE_* keys
  # - POSTGRES_PASSWORD (if changed from default)

cd ..
```

### 4. Start All Services

```bash
# From hetzner/ directory
docker compose -f docker-compose.production.yml up -d

# Check status (wait ~30 seconds for health checks)
docker compose -f docker-compose.production.yml ps

# Expected output: All services showing "healthy"
```

### 5. Verify Deployment

```bash
# PostgreSQL - Check tesis count
docker exec legal-rag-postgres psql -U postgres -d legal_rag -c "SELECT COUNT(*) FROM tesis;"
# Expected: 91634

# pgAdmin - Open browser
open http://your-server-ip:5050
# Login with credentials from docker-compose.production.yml

# Tribunal Scraper - Health check
curl http://localhost:3001/health
# Expected: {"status":"ok","database":"connected"}

# RAG API Server - Health check
curl http://localhost:3002/health
# Expected: {"status":"ok","database":"connected"}

# RAG API - Test chat endpoint
curl -X POST http://localhost:3002/chat \
  -H "Authorization: Bearer your-rag-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"¿Qué es amparo indirecto?"}],
    "userId": "your-user-uuid"
  }'
# Expected: SSE stream with legal research results
```

## 🔧 Service Management

### View Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f rag-api
docker compose -f docker-compose.production.yml logs -f postgres
docker compose -f docker-compose.production.yml logs -f tribunal-scraper
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.production.yml restart

# Specific service
docker compose -f docker-compose.production.yml restart rag-api
```

### Stop Services

```bash
# All services
docker compose -f docker-compose.production.yml down

# Keep volumes (preserve data)
docker compose -f docker-compose.production.yml down --volumes=false
```

### Update Service

```bash
# Pull latest code
git pull origin main

# Rebuild and restart specific service
docker compose -f docker-compose.production.yml up -d --build rag-api

# Or rebuild all
docker compose -f docker-compose.production.yml up -d --build
```

## 🔐 Security Considerations

### Environment Variables

- Never commit `.env` files to git
- Use strong random API keys (`openssl rand -hex 32`)
- Restrict CORS origins in production (`FRONTEND_URL`)

### Network Access

The `monitor_judicial_default` network is internal. To expose services:

1. **Use nginx reverse proxy** (recommended):

```nginx
# /etc/nginx/sites-available/monitor-judicial
server {
    listen 443 ssl;
    server_name rag-api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/rag-api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rag-api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

2. **Obtain SSL certificate**:

```bash
sudo certbot --nginx -d rag-api.your-domain.com
```

3. **Test externally**:

```bash
curl https://rag-api.your-domain.com/health
```

### Database Security

- PostgreSQL only accessible within Docker network
- Agent user has read-only access (`agent_db_user`)
- Use strong passwords (change from defaults in production)

## 📊 Resource Usage

Typical resource usage on 16GB RAM server:

| Service | CPU | Memory | Disk |
|---------|-----|--------|------|
| PostgreSQL | 10-20% | 2-4GB | 10GB (data) |
| pgAdmin | 1-5% | 200-500MB | 100MB |
| Tribunal Scraper | 5-30% | 500MB-2GB | 1GB (logs) |
| RAG API Server | 10-40% | 500MB-2GB | 500MB (logs) |
| **Total** | ~40-70% | ~6-10GB | ~12GB |

## 🐛 Troubleshooting

### PostgreSQL Won't Start

```bash
# Check logs
docker compose -f docker-compose.production.yml logs postgres

# Common issues:
# - Volume corruption → Restore from backup
# - Port conflict → Change port in docker-compose.production.yml
# - Memory issues → Reduce shared_buffers in postgresql.conf
```

### RAG API Returns 500 Error

```bash
# Check logs
docker compose -f docker-compose.production.yml logs rag-api

# Common issues:
# - Database connection failed → Check TESIS_DB_HOST=legal-rag-postgres
# - OpenAI API key invalid → Update .env
# - Supabase connection failed → Check SUPABASE_URL and keys
```

### Tribunal Scraper Fails

```bash
# Check logs
docker compose -f docker-compose.production.yml logs tribunal-scraper

# Common issues:
# - Puppeteer crash → Increase shm_size in docker-compose
# - Memory limit → Increase container memory limit
# - Website changed → Update scraping selectors in lib/
```

### Out of Memory

```bash
# Check Docker memory usage
docker stats

# Solutions:
# 1. Reduce postgres shared_buffers in postgresql.conf
# 2. Reduce container memory limits in docker-compose.production.yml
# 3. Add swap space to server
# 4. Upgrade server RAM
```

## 📈 Monitoring

### Health Checks

All services have built-in health checks. Check status:

```bash
docker compose -f docker-compose.production.yml ps
```

### Performance Metrics

```bash
# Database query performance
docker exec legal-rag-postgres psql -U postgres -d legal_rag -c "
  SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
  FROM pg_stat_user_tables
  ORDER BY seq_scan DESC
  LIMIT 10;
"

# Container resource usage
docker stats --no-stream
```

### Log Rotation

Logs automatically rotate (max 10MB per file, 3 files). To manually clear:

```bash
# Clear all logs
docker compose -f docker-compose.production.yml down
docker system prune -a --volumes

# Clear specific service logs
docker compose -f docker-compose.production.yml logs --tail=0 -f rag-api
```

## 🔄 Backup Strategy

### Database Backup

```bash
# Create volume backup (recommended)
docker run --rm \
  -v legal-rag-postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz -C /data .

# Create SQL dump (alternative)
docker exec legal-rag-postgres pg_dump -U postgres -d legal_rag > backup-$(date +%Y%m%d).sql
```

### Application Backup

All application state is in:
- PostgreSQL volume (`legal-rag-postgres-data`)
- Supabase (conversations, messages)
- Git repository (code)

No additional backups needed for RAG API or Tribunal Scraper.

## 🚢 Deployment Checklist

Before deploying to production:

- [ ] Restore postgres volume backup
- [ ] Configure all `.env` files with production values
- [ ] Set strong API keys and passwords
- [ ] Configure nginx reverse proxy with SSL
- [ ] Test all health endpoints
- [ ] Verify database connection (91,634 tesis)
- [ ] Test RAG chat endpoint end-to-end
- [ ] Test tribunal scraper sync
- [ ] Set up monitoring/alerting
- [ ] Configure automated backups
- [ ] Document server access credentials
- [ ] Update Vercel app to use production RAG API URL

## 📚 Additional Documentation

- **Agentic RAG**: `/home/rodrigo/.claude/projects/-home-rodrigo-code-monitor-judicial/memory/MEMORY.md`
- **Tribunal Scraper**: `tribunal_scraper/README.md`
- **RAG API Server**: `rag_api_server/README.md`
- **Dockerization Plan**: `../DOCKERIZATION_PLAN.md`

## 🆘 Support

- GitHub Issues: https://github.com/yourusername/monitor_judicial/issues
- Internal docs: `/docs` directory in repository

## 📝 License

[Your License Here]
