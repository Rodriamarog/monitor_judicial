# Legal RAG - PostgreSQL Database

Local Docker container for storing tesis embeddings with pgvector for similarity search.

## Quick Start

### 1. Start the Database

```bash
# Start postgres + pgAdmin
docker compose -f docker-compose.local.yml up -d

# View logs
docker compose -f docker-compose.local.yml logs -f postgres

# Check health
docker compose -f docker-compose.local.yml ps
```

### 2. Migrate Existing Embeddings

If you have embeddings in your local postgres (not Docker), run the migration:

```bash
# Set password in .env.local first
echo "LOCAL_POSTGRES_PASSWORD=your-password" >> .env.local

# Run migration
node scripts/migrate-embeddings-to-docker.js
```

This will:
- Export embeddings from local postgres → JSON files
- Import JSON files → Docker postgres
- Create vector indexes
- Validate row counts and embedding dimensions

### 3. Run Health Checks

```bash
./scripts/test-postgres-docker.sh
```

Expected output:
```
✓ Container is running
✓ Connected to PostgreSQL 16.x
✓ pgvector extension installed
✓ tesis_embeddings table exists
✓ Found 32,000+ tesis rows
✓ Vector search working
```

### 4. Access the Database

**Via psql:**
```bash
psql -h localhost -p 5433 -U postgres -d legal_rag
```

**Via pgAdmin:**
- Open http://localhost:5050
- Login: admin@local.dev / admin
- Server "Legal RAG - Local" is pre-configured

## Database Schema

### Main Table: `tesis_embeddings`

| Column | Type | Description |
|--------|------|-------------|
| id_tesis | INTEGER | Primary key |
| rubro | TEXT | Tesis title |
| texto | TEXT | Full text content |
| tipo_tesis | VARCHAR(50) | 'Jurisprudencia' or 'Tesis Aislada' |
| epoca | VARCHAR(50) | '9ª/10ª/11ª/12ª Época' |
| instancia | VARCHAR(100) | 'SCJN', 'Pleno', etc. |
| anio | INTEGER | Year published |
| materias | TEXT[] | Legal topics array |
| rubro_embedding | vector(1536) | Title embedding |
| texto_embedding | vector(1536) | Full text embedding |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Indexes

**Vector indexes (IVFFlat for fast approximate search):**
- `idx_tesis_rubro_embedding` - On rubro_embedding
- `idx_tesis_texto_embedding` - On texto_embedding

**B-tree indexes (for filtering):**
- `idx_tesis_tipo` - On tipo_tesis
- `idx_tesis_epoca` - On epoca
- `idx_tesis_instancia` - On instancia
- `idx_tesis_anio` - On anio

**GIN indexes:**
- `idx_tesis_materias` - On materias array
- `idx_tesis_rubro_trgm` - Full-text on rubro
- `idx_tesis_texto_trgm` - Full-text on texto

## Useful Functions

### `search_tesis_by_embedding()`

Search tesis by vector similarity with optional filters:

```sql
-- Basic search
SELECT * FROM search_tesis_by_embedding(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_count := 10
);

-- With filters
SELECT * FROM search_tesis_by_embedding(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_count := 10,
  filter_tipo_tesis := 'Jurisprudencia',
  filter_epoca := '12ª Época',
  filter_year_min := 2020
);
```

### `get_rag_stats()`

Get database statistics:

```sql
SELECT * FROM get_rag_stats();
```

Returns:
- Total tesis count
- Counts by tipo_tesis (Jurisprudencia vs Tesis Aislada)
- Counts by época
- Database size
- Table size

### `validate_embeddings()`

Validate embedding integrity:

```sql
SELECT * FROM validate_embeddings();
```

Checks:
- All embeddings are 1536-dimensional
- No invalid dimensions
- Reports null embeddings

## Maintenance

### Backup Database

```bash
# Dump all data
docker exec legal-rag-postgres pg_dump -U postgres legal_rag > backup.sql

# Restore from backup
cat backup.sql | docker exec -i legal-rag-postgres psql -U postgres legal_rag
```

### Backup Volume (Faster)

```bash
# Stop container
docker compose -f docker-compose.local.yml down

# Backup volume
docker run --rm -v legal-rag-postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data

# Start container
docker compose -f docker-compose.local.yml up -d
```

### Rebuild Indexes

If vector search is slow:

```bash
psql -h localhost -p 5433 -U postgres -d legal_rag -c "
  REINDEX INDEX idx_tesis_rubro_embedding;
  REINDEX INDEX idx_tesis_texto_embedding;
"
```

### Vacuum Database

Run periodically to reclaim space:

```bash
docker exec legal-rag-postgres psql -U postgres -d legal_rag -c "VACUUM ANALYZE tesis_embeddings;"
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.local.yml logs postgres

# Common issue: port 5433 already in use
lsof -i :5433
# Kill the process or change port in docker-compose.local.yml
```

### Cannot connect to database

```bash
# Check container is running
docker ps | grep legal-rag-postgres

# Check health
docker compose -f docker-compose.local.yml ps

# Test connection
docker exec legal-rag-postgres psql -U postgres -c "SELECT 1;"
```

### Slow vector search

```bash
# Check if indexes exist
psql -h localhost -p 5433 -U postgres -d legal_rag -c "\di"

# If missing, create them
psql -h localhost -p 5433 -U postgres -d legal_rag -f postgres/init/04-indexes.sql
```

### Out of disk space

```bash
# Check volume size
docker system df -v

# Clean up old containers/images
docker system prune -a

# Check database size
psql -h localhost -p 5433 -U postgres -d legal_rag -c "
  SELECT pg_size_pretty(pg_database_size('legal_rag'));
"
```

## Performance Tuning

### Query Planning

```sql
-- Analyze a vector search query
EXPLAIN ANALYZE
SELECT * FROM search_tesis_by_embedding(
  array_fill(0.1, ARRAY[1536])::vector,
  10
);
```

Look for:
- "Index Scan using idx_tesis_texto_embedding" (good)
- "Seq Scan on tesis_embeddings" (bad, rebuild index)

### Connection Pooling

For production, use connection pooling:

```typescript
// lib/db/local-tesis-client.ts
export const localTesisPool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'legal_rag',
  user: 'postgres',
  password: process.env.LOCAL_POSTGRES_PASSWORD,
  max: 20,  // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

## Next Steps

1. ✅ Start Docker postgres container
2. ✅ Migrate embeddings from local → Docker
3. ✅ Run health checks
4. ⏳ Update `.env.local` to point to Docker postgres (port 5433)
5. ⏳ Update `lib/db/local-tesis-client.ts` connection config
6. ⏳ Test RAG queries through the app
7. ⏳ Monitor performance and logs
8. ⏳ Once stable, deploy to Hetzner
