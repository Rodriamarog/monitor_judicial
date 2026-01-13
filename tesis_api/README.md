# Tesis Update System Documentation

## Overview

The Tesis Update System is an automated pipeline that fetches new legal theses (tesis) from the Supreme Court of Justice of Mexico (SCJN) API, generates embeddings for semantic search, and stores them in Supabase.

**Key Features:**
- Runs automatically every Sunday at 3:45 AM UTC via GitHub Actions
- Can be manually triggered with optional dry-run mode
- Only processes new tesis (skips existing ones)
- Generates 256-dimension embeddings using OpenAI's text-embedding-3-small model
- Stores data in Supabase using halfvec with IVFFlat indexing
- Records all automation runs for monitoring and audit trail

## Architecture

### Components

1. **Data Source**: SCJN Bicentenario API
   - IDs Endpoint: `https://bicentenario.scjn.gob.mx/repositorio-scjn/api/v1/tesis/ids`
   - Tesis Endpoint: `https://bicentenario.scjn.gob.mx/repositorio-scjn/api/v1/tesis/{id}`

2. **Processing Pipeline** (`update_incremental.py`):
   - Fetches recent IDs from API (10 pages = ~2,000 IDs)
   - Batch checks which IDs already exist in database
   - Downloads only new tesis
   - Generates embeddings for rubro and texto fields
   - Inserts to Supabase via REST API

3. **Database** (Supabase PostgreSQL):
   - `tesis_documents`: Main tesis data
   - `tesis_embeddings`: Vector embeddings for semantic search
   - `tesis_automation_runs`: Audit log of all runs

4. **Automation** (GitHub Actions):
   - Workflow file: `.github/workflows/update-tesis.yml`
   - Scheduled runs + manual trigger support
   - Dry-run mode for testing

### Data Flow

```
SCJN API → Fetch IDs → Check Existing → Download New Tesis
    ↓
Generate Embeddings (OpenAI)
    ↓
Insert to Supabase (REST API)
    ↓
Record Run Metadata
```

## Configuration

### Required GitHub Secrets

Set these in your GitHub repository under Settings → Secrets and variables → Actions:

| Secret | Description | Format |
|--------|-------------|--------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin access | `eyJhbGc...` (no quotes) |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | `sk-...` (no quotes) |

### Environment Variables

The workflow accepts these parameters:

- `RUN_TYPE`: `scheduled` (default) or `manual`
- `DRY_RUN`: `true` for testing (no database writes), `false` for production

## Usage

### Automatic Scheduled Runs

The workflow runs automatically every Sunday at 3:45 AM UTC. No action required.

### Manual Trigger (Production)

To manually fetch and process new tesis:

1. Go to **Actions** tab in GitHub
2. Select **Weekly Tesis Update** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Run type: `manual`
6. Dry run: `false`
7. Click **Run workflow**

### Manual Trigger (Dry Run / Testing)

To test without making database changes:

1. Go to **Actions** tab in GitHub
2. Select **Weekly Tesis Update** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Run type: `manual`
6. Dry run: `true` ← **Important for testing**
7. Click **Run workflow**

## Monitoring

### Check Workflow Status

1. Go to **Actions** tab in GitHub
2. Select the workflow run
3. View logs for detailed output

### Check Automation Runs Table

Query the `tesis_automation_runs` table in Supabase:

```sql
SELECT
  run_at,
  run_type,
  status,
  new_tesis_count,
  new_embeddings_count,
  last_processed_id,
  error_message
FROM tesis_automation_runs
ORDER BY run_at DESC
LIMIT 10;
```

### Expected Performance

- **Fetch Time**: ~10-15 seconds for 2,000 IDs
- **Check Existing**: ~1-2 seconds (batch processing)
- **Process New Tesis**: Depends on count (~0.5s per tesis)
- **Total Runtime**: Typically 30-90 seconds for 50-100 new tesis

Recent test run (2026-01-12):
- Fetched: 2,000 IDs
- Found existing: 1,909
- Processed new: 91 tesis
- Runtime: 56 seconds (dry-run)

## How It Works

### ID Fetching Strategy

The SCJN API returns IDs in **non-sequential order**, which means we can't stop when we find an existing ID. Instead, we:

1. **Fetch Fixed Pages**: Get 10 pages (200 IDs each = 2,000 total)
2. **Batch Check**: Query database in batches of 1,000 to find existing IDs
3. **Filter**: Keep only IDs that don't exist in database
4. **Process**: Download and embed only new tesis

This approach is efficient because:
- 10 pages covers ~3-4 weeks of new tesis (typically 50-150 new)
- Batch checking is fast (1-2 seconds for 2,000 IDs)
- We only download/embed what's actually new

### Text Processing

Each tesis has two main text fields:

1. **Rubro** (heading/summary):
   - Chunked with overlap for context
   - Typically 1-2 chunks
   - Chunk type: `rubro`

2. **Texto** (full text):
   - Chunked into manageable pieces
   - Can be many chunks for long tesis
   - Chunk type: `full`

### Embedding Generation

- **Model**: `text-embedding-3-small`
- **Dimensions**: 256 (for efficient storage and fast search)
- **Storage**: `halfvec` type in PostgreSQL (16-bit floats)
- **Index**: IVFFlat for approximate nearest neighbor search

Each chunk gets its own embedding:

```python
response = openai_client.embeddings.create(
    model='text-embedding-3-small',
    input=chunk_text,
    dimensions=256
)
embedding = response.data[0].embedding
```

### Database Insertion

Uses Supabase REST API client for reliable CI/CD connectivity:

```python
# Insert tesis document (uses upsert to handle duplicates)
supabase.table('tesis_documents').upsert(doc).execute()

# Insert embeddings batch
supabase.table('tesis_embeddings').upsert(embeddings_to_insert).execute()
```

## Troubleshooting

### Workflow Fails with "Missing environment variables"

**Cause**: GitHub Secrets not set or misspelled

**Solution**:
1. Go to Settings → Secrets and variables → Actions
2. Verify secrets exist: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
3. Check for typos in secret names
4. Ensure no quotes in secret values

### Workflow Runs for Too Long

**Cause**: Processing too many IDs or API slowness

**Solution**:
1. Check logs to see how many IDs were fetched
2. If > 2,000 IDs, the max_pages parameter may need adjustment
3. Check SCJN API status - may be slow or rate-limiting
4. Verify batch checking is working (should be fast)

### No New Tesis Found

**Cause**: Database already up to date

**Solution**: This is normal! The workflow will log:
```
No new tesis to process
```

This means all recent tesis are already in the database.

### OpenAI API Errors

**Cause**: API key invalid, rate limits, or quota exceeded

**Solution**:
1. Verify `OPENAI_API_KEY` is valid
2. Check OpenAI dashboard for rate limits
3. Verify account has sufficient credits
4. Check logs for specific error message

### Supabase Connection Errors

**Cause**: Invalid credentials or network issues

**Solution**:
1. Verify `SUPABASE_URL` format: `https://xxxxx.supabase.co`
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is service role, not anon key
3. Check Supabase project is active (not paused)
4. Review Supabase logs for connection attempts

## Database Schema

### tesis_documents

Main table storing tesis metadata and content:

```sql
id_tesis           INTEGER PRIMARY KEY
rubro              TEXT
texto              TEXT
precedentes        TEXT
epoca              TEXT
instancia          TEXT
organo_juris       TEXT
fuente             TEXT
tesis              TEXT
tipo_tesis         TEXT
localizacion       TEXT
anio               INTEGER
mes                INTEGER
nota_publica       TEXT
anexos             JSONB
huella_digital     TEXT
materias           TEXT[]
created_at         TIMESTAMP
```

### tesis_embeddings

Embeddings for semantic search:

```sql
id                 UUID PRIMARY KEY
id_tesis           INTEGER REFERENCES tesis_documents
chunk_index        INTEGER
chunk_text         TEXT
chunk_type         TEXT (rubro/full)
embedding_reduced  halfvec(256)
created_at         TIMESTAMP
```

### tesis_automation_runs

Audit log of all automation runs:

```sql
id                     UUID PRIMARY KEY
run_at                 TIMESTAMP
run_type               TEXT (scheduled/manual)
status                 TEXT (success/failed)
new_tesis_count        INTEGER
new_embeddings_count   INTEGER
error_message          TEXT
last_processed_id      INTEGER
```

## Development

### Local Testing

To test the script locally:

```bash
cd tesis_api

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export RUN_TYPE="manual"
export DRY_RUN="true"

# Run script
python update_incremental.py
```

### Dry Run Mode

Dry run mode simulates the workflow without making database changes:

- ✅ Fetches IDs from API
- ✅ Checks existing IDs in database
- ✅ Downloads tesis from API
- ❌ Does NOT insert to database
- ❌ Does NOT generate embeddings
- ❌ Does NOT record automation run

Perfect for testing changes without affecting production data.

### Code Structure

```
tesis_api/
├── update_incremental.py    # Main pipeline script
├── text_processing.py        # Text chunking utilities
├── requirements.txt          # Python dependencies
└── README.md                 # This file
```

## Best Practices

### When to Run Manually

- After schema changes to tesis tables
- After fixing a bug in the pipeline
- When you know there are many new tesis (> 1 week gap)
- To backfill if scheduled run failed

### Monitoring Checklist

Check weekly:
1. Last scheduled run completed successfully
2. New tesis count is reasonable (50-150 per week)
3. No error messages in automation_runs table
4. Embeddings count matches tesis count (should be ~2-5x)

### Cost Considerations

**OpenAI Embeddings**:
- text-embedding-3-small at 256 dimensions
- Cost: ~$0.00002 per 1,000 tokens
- Average tesis: ~500-1000 tokens
- 100 new tesis/week = ~$0.001-0.002 per week

**Supabase**:
- Storage: Minimal (each tesis ~10-50 KB)
- Database operations: Well within free tier

## Support

For issues or questions:

1. Check this README first
2. Review workflow logs in GitHub Actions
3. Query `tesis_automation_runs` table for error details
4. Check Supabase logs for database errors

## Version History

- **2026-01-12**: Initial version with optimized batch processing
  - Implemented fixed-page fetching strategy (10 pages)
  - Added batch ID checking (1,000 IDs per batch)
  - Switched from psycopg2 to Supabase REST API client
  - Added dry-run mode support
  - Reduced runtime from 32+ minutes to ~56 seconds

---

**Last Updated**: 2026-01-12
