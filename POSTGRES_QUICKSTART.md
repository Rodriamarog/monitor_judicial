# Legal RAG Postgres - Quick Start Guide

**Goal**: Containerize your local postgres database with embeddings for easy deployment.

## 🚀 5-Minute Setup

### Step 1: Start the Container

```bash
# From project root
docker compose -f docker-compose.local.yml up -d

# Watch logs
docker compose -f docker-compose.local.yml logs -f postgres
```

Wait for: `database system is ready to accept connections`

### Step 2: Migrate Your Embeddings

```bash
# Set your local postgres password (if needed)
echo "LOCAL_POSTGRES_PASSWORD=your-password-here" >> .env.local

# Run migration script
node scripts/migrate-embeddings-to-docker.js
```

This takes ~5-10 minutes for 32k tesis.

Progress output:
```
[INFO] Exporting batch 1 (rows 1-1000)
[SUCCESS] Batch 1 exported to batch_0001.json
...
[INFO] Importing batch 1/32
[SUCCESS] Batch 1 imported (1000/32000 total)
...
[INFO] Creating vector indexes...
[SUCCESS] Migration validated successfully!
```

### Step 3: Run Health Checks

```bash
./scripts/test-postgres-docker.sh
```

Expected output:
```
✓ Container is running
✓ Connected to PostgreSQL 16.x
✓ pgvector extension installed
✓ Found 32,000 tesis rows
✓ Vector search working
```

### Step 4: Test Vector Search

```bash
psql -h localhost -p 5433 -U postgres -d legal_rag

# Run test query
legal_rag=# SELECT * FROM get_rag_stats();

# Test vector search function
legal_rag=# SELECT id_tesis, rubro, similarity
            FROM search_tesis_by_embedding(
              array_fill(0.1, ARRAY[1536])::vector,
              5
            );
```

## ✅ Success Checklist

- [ ] Container running (`docker ps`)
- [ ] Database has 32k+ rows (`SELECT COUNT(*) FROM tesis_embeddings`)
- [ ] Vector indexes created (`\di` shows `idx_tesis_texto_embedding`)
- [ ] Health check passes (`./scripts/test-postgres-docker.sh`)
- [ ] Vector search returns results

## 🎯 What You Get

**Infrastructure:**
- ✅ Postgres 16 with pgvector extension
- ✅ Optimized for vector similarity search
- ✅ Health checks and monitoring
- ✅ pgAdmin UI for database management
- ✅ Persistent data volume (survives restarts)

**Logging:**
- Console logs via Docker
- Postgres query logs (slow queries > 1s)
- Structured JSON-friendly format

**Utilities:**
- `get_rag_stats()` - Database statistics
- `validate_embeddings()` - Data integrity checks
- `search_tesis_by_embedding()` - Vector search function

## 📁 What Was Created

```
monitor_judicial/
├── docker-compose.local.yml          # Docker setup
├── postgres/
│   ├── init/
│   │   ├── 01-extensions.sql        # pgvector, pg_trgm, uuid-ossp
│   │   ├── 02-schema.sql            # tesis_embeddings table
│   │   └── 03-functions.sql         # Utility functions
│   ├── postgresql.conf              # Performance tuning
│   ├── pgadmin-servers.json         # pgAdmin config
│   ├── export/                      # Migration data (gitignored)
│   └── README.md                    # Detailed docs
├── scripts/
│   ├── migrate-embeddings-to-docker.js  # Migration script
│   └── test-postgres-docker.sh          # Health checks
└── POSTGRES_QUICKSTART.md           # This file
```

## 🔧 Daily Usage

**Start database:**
```bash
docker compose -f docker-compose.local.yml up -d
```

**Stop database:**
```bash
docker compose -f docker-compose.local.yml down
```

**View logs:**
```bash
docker compose -f docker-compose.local.yml logs -f postgres
```

**Connect via psql:**
```bash
psql -h localhost -p 5433 -U postgres -d legal_rag
```

**Access pgAdmin:**
```
http://localhost:5050
Login: admin@local.dev / admin
```

## 🐛 Troubleshooting

### "Port 5433 already in use"

```bash
# Check what's using it
lsof -i :5433

# Change port in docker-compose.local.yml if needed
ports:
  - "5434:5432"  # Use 5434 instead
```

### "Cannot connect to database"

```bash
# Check container status
docker compose -f docker-compose.local.yml ps

# Check logs for errors
docker compose -f docker-compose.local.yml logs postgres

# Restart container
docker compose -f docker-compose.local.yml restart postgres
```

### "Migration script fails"

```bash
# Check source database is running
psql -h localhost -p 5432 -U rodrigo -d legal_rag -c "SELECT COUNT(*) FROM tesis_embeddings;"

# Check target database is running
psql -h localhost -p 5433 -U postgres -d legal_rag -c "SELECT 1;"

# Check password is set
echo $LOCAL_POSTGRES_PASSWORD
```

### "Vector search returns no results"

```bash
# Check if indexes exist
psql -h localhost -p 5433 -U postgres -d legal_rag -c "\di"

# If missing, indexes might still be building
# Check postgres logs for "CREATE INDEX" progress
docker compose -f docker-compose.local.yml logs postgres | grep -i "create index"
```

## 📊 Monitoring

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('legal_rag'));
```

**Check table size:**
```sql
SELECT pg_size_pretty(pg_total_relation_size('tesis_embeddings'));
```

**Check index sizes:**
```sql
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Monitor slow queries:**
```bash
# In docker-compose logs
docker compose -f docker-compose.local.yml logs postgres | grep "duration:"
```

## 🎓 Next Steps

Once local docker is working:

1. **Update your app to use Docker postgres:**
   ```typescript
   // lib/db/local-tesis-client.ts
   export const localTesisPool = new Pool({
     host: 'localhost',
     port: 5433,  // ← Changed from 5432
     database: 'legal_rag',
     user: 'postgres',  // ← Changed from 'rodrigo'
     password: process.env.LOCAL_POSTGRES_PASSWORD,
   });
   ```

2. **Test RAG queries through the app:**
   - Start Next.js: `npm run dev`
   - Go to AI Assistant
   - Ask a question
   - Verify it's using Docker postgres (check logs)

3. **Run performance tests:**
   - Measure query latency
   - Check embedding search quality
   - Monitor resource usage

4. **When ready, deploy to Hetzner:**
   - Copy docker-compose.local.yml → hetzner/docker-compose.yml
   - Adjust ports/passwords for production
   - Use same migration script to populate

## 📚 Learn More

- **Full documentation:** `postgres/README.md`
- **Docker logs:** `docker compose -f docker-compose.local.yml logs -f`
- **pgAdmin docs:** https://www.pgadmin.org/docs/
- **pgvector docs:** https://github.com/pgvector/pgvector

---

**Questions?** Check `postgres/README.md` for detailed troubleshooting and maintenance guides.
