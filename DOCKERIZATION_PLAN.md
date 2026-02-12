# Monitor Judicial - Dockerization Plan

**Date**: 2026-02-11
**Goal**: Dockerize the Next.js app with TypeScript RAG for Hetzner deployment
**Status**: Ready for implementation

---

## 📊 Current Architecture

### ✅ Already Dockerized

#### 1. PostgreSQL Database with pgvector (Port 5433 local / 5432 production)
- **Location**: `docker-compose.local.yml`
- **Purpose**: Stores 32k+ tesis embeddings for vector search
- **Services**:
  - PostgreSQL 16 with pgvector extension
  - pgAdmin (Port 5050) for database management
- **Schema**: `postgres/init/` (extensions, schema, functions)
- **Status**: ✅ Working locally, ready for production

#### 2. Tribunal Electrónico Scraper (Port 3001)
- **Location**: `hetzner/`
- **Docker Files**: `hetzner/Dockerfile`, `hetzner/docker-compose.yml`
- **Purpose**: Scrapes tribunal cases, validates credentials via SSE
- **Tech**: Node.js + Puppeteer + Express
- **Status**: ✅ Production-ready

### ❌ NOT Dockerized (Priority)

#### 3. Next.js Web Application with TypeScript RAG (Port 3000)
- **Location**: Root directory
- **Purpose**: Main web application
- **Components**:
  - Next.js 16.1.1 with React 19
  - **TypeScript Agentic RAG** (`lib/ai/`)
    - `agent-controller.ts` - Main iteration loop (5 exit conditions)
    - `agent-state.ts` - State management, cost tracking
    - `legal-reranker.ts` - Legal hierarchy scoring
    - `quality-evaluator.ts` - LLM-driven evaluation (4 decisions)
    - `query-rewriter.ts` - Context-aware rewriting
    - `sliding-window.ts` - Conversation windowing
  - **API Routes** (`app/api/`)
    - `/ai-assistant/chat` - Main RAG endpoint
    - `/tesis/*` - Tesis management
    - `/casos/*` - Case management
    - `/tribunal/*` - Tribunal integration
  - **Database Clients**:
    - Supabase client (user data, conversations, cases)
    - Local Postgres client (`lib/db/local-tesis-client.ts`) for RAG
- **Status**: ❌ Needs dockerization

---

## 🏗️ Proposed Architecture

### Production Stack (docker-compose.production.yml)

```
┌─────────────────────────────────────────────────────────────┐
│                      Hetzner Server                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Next.js App   │  │  Tribunal      │  │  PostgreSQL  │  │
│  │  (Port 3000)   │  │  Scraper       │  │  + pgvector  │  │
│  │                │  │  (Port 3001)   │  │  (Port 5432) │  │
│  │  - TypeScript  │  │                │  │              │  │
│  │    RAG System  │  │  - Puppeteer   │  │  - 32k tesis │  │
│  │  - AI Chat     │  │  - SSE Server  │  │  - Vector    │  │
│  │  - Case Mgmt   │  │                │  │    Search    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                   Docker Network                             │
│                                                               │
│  External Services (Outside Docker):                         │
│  - Supabase (user data, conversations)                       │
│  - OpenAI API (embeddings, LLM)                              │
│  - Stripe, Twilio, Resend, Google Calendar                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker Implementation

### 1. Next.js Dockerfile

**File**: `Dockerfile.nextjs` (create in root)

```dockerfile
# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (use legacy peer deps flag from package.json)
RUN npm ci --legacy-peer-deps

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment to production for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app (uses standalone output)
RUN npm run build

# ============================================================================
# Stage 3: Runner (Production)
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["node", "server.js"]
```

**Key Features**:
- Multi-stage build for minimal image size
- Uses Next.js standalone output mode
- Non-root user for security
- Health check included

### 2. Next.js Configuration

**Update**: `next.config.ts` (add standalone output)

```typescript
const nextConfig = {
  output: 'standalone', // Required for Docker
  // ... existing config
};
```

### 3. Production Docker Compose

**File**: `docker-compose.production.yml` (create in root)

```yaml
version: '3.9'

services:
  # PostgreSQL with pgvector for RAG embeddings
  postgres:
    image: pgvector/pgvector:pg16
    container_name: legal-rag-postgres
    restart: unless-stopped

    ports:
      - "5432:5432"  # Internal only in production (no external exposure)

    environment:
      POSTGRES_DB: legal_rag
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"
      POSTGRES_LOG_MIN_DURATION_STATEMENT: 1000

    volumes:
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - postgres-data:/var/lib/postgresql/data

    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 2G

    shm_size: 4gb

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d legal_rag"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=postgres,env=production"

    networks:
      - monitor-network

  # Next.js Application with TypeScript RAG
  nextjs-app:
    build:
      context: .
      dockerfile: Dockerfile.nextjs
      args:
        NODE_ENV: production

    container_name: monitor-judicial-app
    restart: unless-stopped

    ports:
      - "3000:3000"

    environment:
      # Node environment
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1

      # Local Postgres (RAG database)
      - TESIS_DB_HOST=postgres
      - TESIS_DB_PORT=5432
      - TESIS_DB_NAME=legal_rag
      - TESIS_DB_USER=postgres
      - TESIS_DB_PASSWORD=${POSTGRES_PASSWORD}

      # Supabase (main app database)
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - POSTGRES_URL=${POSTGRES_URL}

      # LLM APIs
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}

      # RAG Configuration
      - USE_AGENTIC_RAG=true

      # External Services
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}

      # Google Calendar OAuth
      - GOOGLE_CALENDAR_CLIENT_ID=${GOOGLE_CALENDAR_CLIENT_ID}
      - GOOGLE_CALENDAR_CLIENT_SECRET=${GOOGLE_CALENDAR_CLIENT_SECRET}

      # Cron Secret
      - CRON_SECRET=${CRON_SECRET}

      # Tribunal Scraper URL (internal)
      - HETZNER_VALIDATION_URL=http://scraper:3001/validate-credentials
      - NEXT_PUBLIC_HETZNER_VALIDATION_URL=${NEXT_PUBLIC_HETZNER_VALIDATION_URL}

      # Public App URL
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

    depends_on:
      postgres:
        condition: service_healthy
      scraper:
        condition: service_healthy

    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=nextjs,env=production"

    networks:
      - monitor-network

  # Tribunal Electrónico Scraper
  scraper:
    build:
      context: .
      dockerfile: hetzner/Dockerfile

    container_name: tribunal-scraper
    restart: unless-stopped

    ports:
      - "3001:3001"

    environment:
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
      - NODE_ENV=production
      # Supabase credentials for case storage
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

    shm_size: 2gb

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=scraper,env=production"

    networks:
      - monitor-network

  # Optional: pgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: legal-rag-pgadmin
    restart: unless-stopped

    ports:
      - "5050:80"

    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
      PGADMIN_CONFIG_SERVER_MODE: 'False'

    volumes:
      - pgadmin-data:/var/lib/pgadmin
      - ./postgres/pgadmin-servers.json:/pgadmin4/servers.json:ro

    depends_on:
      - postgres

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    networks:
      - monitor-network

    profiles:
      - admin  # Only start with: docker compose --profile admin up

volumes:
  postgres-data:
    name: legal-rag-postgres-data
  pgadmin-data:
    name: legal-rag-pgadmin-data

networks:
  monitor-network:
    name: monitor-judicial-network
    driver: bridge
```

### 4. Environment Configuration

**File**: `.env.production` (create from template)

```bash
# ============================================================================
# Production Environment Variables
# ============================================================================

# PostgreSQL (Local - RAG Database)
POSTGRES_PASSWORD=<strong-password-here>

# Supabase (Remote - Main Database)
NEXT_PUBLIC_SUPABASE_URL=https://mnotrrzjswisbwkgbyow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
POSTGRES_URL=<your-supabase-connection-string>

# OpenAI API
OPENAI_API_KEY=<your-openai-key>

# Gemini API (optional)
GEMINI_API_KEY=<your-gemini-key>

# RAG Configuration
USE_AGENTIC_RAG=true

# Stripe
STRIPE_SECRET_KEY=<your-stripe-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-public>

# Resend (Email)
RESEND_API_KEY=<your-resend-key>

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>

# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=<your-client-id>
GOOGLE_CALENDAR_CLIENT_SECRET=<your-client-secret>

# Cron Secret
CRON_SECRET=<strong-random-secret>

# Public URLs
NEXT_PUBLIC_APP_URL=https://monitorjudicial.com.mx
NEXT_PUBLIC_HETZNER_VALIDATION_URL=https://monitorjudicial.com.mx/api/tribunal/validate

# pgAdmin (Optional)
PGADMIN_EMAIL=admin@monitorjudicial.com.mx
PGADMIN_PASSWORD=<admin-password>
```

### 5. Health Check Endpoint

**File**: `app/api/health/route.ts` (create if not exists)

```typescript
import { NextResponse } from 'next/server'
import { queryLocalTesis } from '@/lib/db/local-tesis-client'

export async function GET() {
  try {
    // Check database connectivity
    const result = await queryLocalTesis<{ count: number }>(
      'SELECT COUNT(*) as count FROM tesis_embeddings',
      []
    )

    const tesisCount = result[0]?.count || 0

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: tesisCount > 0 ? 'connected' : 'no data',
        tesisCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
```

### 6. Docker Ignore File

**File**: `.dockerignore` (update or create)

```
# Dependencies
node_modules
npm-debug.log
yarn-error.log

# Next.js
.next
out

# Environment
.env.local
.env.development
.env.test

# Git
.git
.gitignore

# Documentation
*.md
docs/

# Tests
__tests__
*.test.ts
*.test.tsx
vitest.config.ts

# Python RAG (not used)
rag_system/

# Development
.vscode
.idea
*.log

# OS
.DS_Store
Thumbs.db
```

---

## 🚀 Deployment Steps

### Local Testing (Development)

```bash
# 1. Ensure local database is running
docker compose -f docker-compose.local.yml up -d

# 2. Build Next.js Docker image
docker build -f Dockerfile.nextjs -t monitor-judicial-nextjs .

# 3. Test the image
docker run -p 3000:3000 \
  --env-file .env.local \
  -e TESIS_DB_HOST=host.docker.internal \
  monitor-judicial-nextjs

# 4. Access at http://localhost:3000
```

### Production Deployment (Hetzner)

```bash
# === ON HETZNER SERVER ===

# 1. Clone repository
cd /opt
git clone <your-repo> monitor_judicial
cd monitor_judicial

# 2. Create production environment file
cp .env.example .env.production
nano .env.production  # Edit with production values

# 3. Build and start all services
docker compose -f docker-compose.production.yml up -d --build

# 4. Verify all services are healthy
docker compose -f docker-compose.production.yml ps

# Expected output:
# NAME                      STATUS         PORTS
# monitor-judicial-app      Up (healthy)   0.0.0.0:3000->3000/tcp
# legal-rag-postgres        Up (healthy)   5432/tcp
# tribunal-scraper          Up (healthy)   0.0.0.0:3001->3001/tcp

# 5. Check logs
docker compose -f docker-compose.production.yml logs -f

# 6. Test health endpoints
curl http://localhost:3000/api/health
curl http://localhost:3001/health

# 7. Migrate embeddings to postgres (one-time)
# If not already migrated, run migration script
docker compose exec postgres psql -U postgres -d legal_rag -c "SELECT COUNT(*) FROM tesis_embeddings;"
```

### Post-Deployment Setup

```bash
# 1. Set up reverse proxy (nginx or Caddy)
# See NGINX_SETUP.md (to be created)

# 2. Configure SSL/TLS with Let's Encrypt
certbot --nginx -d monitorjudicial.com.mx

# 3. Set up automated backups
# Add to crontab:
0 2 * * * /opt/monitor_judicial/scripts/backup-postgres.sh

# 4. Configure monitoring (optional)
# Install Portainer for container management
docker run -d -p 9000:9000 --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

---

## 💻 Recommended Hetzner Server Specs

### Minimum (Testing)
- **Plan**: CX31
- **vCPUs**: 2
- **RAM**: 8 GB
- **Storage**: 80 GB SSD
- **Cost**: ~€10/month

### Recommended (Production)
- **Plan**: CX41
- **vCPUs**: 4
- **RAM**: 16 GB
- **Storage**: 160 GB SSD
- **Cost**: ~€20/month

**Resource Allocation**:
- Next.js app: 1-2GB RAM
- Postgres + pgvector: 4-6GB RAM (for HNSW indexes)
- Puppeteer scraper: 2-3GB RAM (Chromium)
- System overhead: 1-2GB RAM
- Buffer: 4-6GB RAM

### Enterprise (High Traffic)
- **Plan**: CX51
- **vCPUs**: 8
- **RAM**: 32 GB
- **Storage**: 240 GB SSD
- **Cost**: ~€40/month

---

## 🔧 Maintenance

### Common Commands

```bash
# View logs
docker compose -f docker-compose.production.yml logs -f nextjs-app

# Restart a service
docker compose -f docker-compose.production.yml restart nextjs-app

# Update after code changes
git pull
docker compose -f docker-compose.production.yml up -d --build nextjs-app

# Stop all services
docker compose -f docker-compose.production.yml down

# View resource usage
docker stats

# Backup database
docker compose exec postgres pg_dump -U postgres legal_rag > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres legal_rag < backup.sql
```

### Updating the Application

```bash
# 1. Pull latest changes
cd /opt/monitor_judicial
git pull origin main

# 2. Rebuild only changed services
docker compose -f docker-compose.production.yml up -d --build

# 3. Check health
docker compose ps
```

### Monitoring

```bash
# Check container health
docker compose ps

# View resource usage
docker stats --no-stream

# Check disk usage
docker system df

# Clean up old images
docker system prune -a --filter "until=24h"
```

---

## 🛡️ Security Checklist

- [ ] Strong passwords for all services
- [ ] `.env.production` not in git (added to .gitignore)
- [ ] UFW firewall configured (allow only 80, 443, 22)
- [ ] fail2ban installed for SSH protection
- [ ] Docker containers run as non-root users
- [ ] Database not exposed externally (internal network only)
- [ ] SSL/TLS configured with Let's Encrypt
- [ ] Regular security updates (`apt update && apt upgrade`)
- [ ] Automated backups configured
- [ ] Monitoring and alerting set up

---

## 📊 Success Criteria

- [x] Python RAG system marked as deprecated
- [ ] `Dockerfile.nextjs` created and tested
- [ ] `docker-compose.production.yml` created
- [ ] `.env.production` template created
- [ ] Health check endpoint implemented
- [ ] Local Docker build successful
- [ ] All services start and pass health checks
- [ ] Next.js app connects to Postgres successfully
- [ ] TypeScript RAG performs vector search
- [ ] Tribunal scraper integrates with Next.js
- [ ] SSL/TLS configured on Hetzner
- [ ] Automated backups working
- [ ] Documentation complete

---

## 📚 Next Steps

1. **Create Dockerfile.nextjs** - Multi-stage build for Next.js app
2. **Test locally** - Build and run Docker image locally
3. **Create docker-compose.production.yml** - Full production stack
4. **Test integration** - Verify all services work together
5. **Deploy to Hetzner** - Follow deployment steps
6. **Configure reverse proxy** - Nginx or Caddy with SSL
7. **Set up monitoring** - Health checks and alerts
8. **Document procedures** - Maintenance and troubleshooting

---

**Status**: Ready for implementation
**Last Updated**: 2026-02-11
**Next**: Create Dockerfile.nextjs and begin testing
