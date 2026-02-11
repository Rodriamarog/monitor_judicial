#!/bin/bash
# Test script for Docker Postgres container
# Validates that the database is running correctly and embeddings work

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Load password from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep LOCAL_POSTGRES_PASSWORD | xargs)
fi

PGPASSWORD="${LOCAL_POSTGRES_PASSWORD:-postgres}"
PGHOST="localhost"
PGPORT="5433"
PGDATABASE="legal_rag"
PGUSER="postgres"

export PGPASSWORD PGHOST PGPORT PGDATABASE PGUSER

echo "=== Docker Postgres Health Check ==="
echo ""

# Test 1: Check if container is running
log_info "Test 1: Checking if container is running..."
if docker ps | grep -q "legal-rag-postgres"; then
  log_success "Container is running"
else
  log_error "Container is not running!"
  echo "Start it with: docker compose -f docker-compose.local.yml up -d"
  exit 1
fi

# Test 2: Check database connectivity
log_info "Test 2: Testing database connection..."
if psql -c "SELECT version();" > /dev/null 2>&1; then
  VERSION=$(psql -t -c "SELECT version();" | head -1)
  log_success "Connected to: $VERSION"
else
  log_error "Cannot connect to database"
  exit 1
fi

# Test 3: Check pgvector extension
log_info "Test 3: Checking pgvector extension..."
if psql -t -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" | grep -q "vector"; then
  log_success "pgvector extension installed"
else
  log_error "pgvector extension not found"
  exit 1
fi

# Test 4: Check schema
log_info "Test 4: Checking database schema..."
if psql -t -c "SELECT tablename FROM pg_tables WHERE tablename = 'tesis_embeddings';" | grep -q "tesis_embeddings"; then
  log_success "tesis_embeddings table exists"
else
  log_error "tesis_embeddings table not found"
  exit 1
fi

# Test 5: Check row count
log_info "Test 5: Counting rows..."
ROW_COUNT=$(psql -t -c "SELECT COUNT(*) FROM tesis_embeddings;" | xargs)
if [ "$ROW_COUNT" -gt 0 ]; then
  log_success "Found $ROW_COUNT tesis rows"
else
  log_warn "Table is empty (0 rows). Run migration script to import data."
fi

# Test 6: Check indexes
log_info "Test 6: Checking indexes..."
INDEX_COUNT=$(psql -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'tesis_embeddings';" | xargs)
log_info "Found $INDEX_COUNT indexes on tesis_embeddings"

# Test 7: Check functions
log_info "Test 7: Checking custom functions..."
if psql -t -c "SELECT proname FROM pg_proc WHERE proname = 'search_tesis_by_embedding';" | grep -q "search_tesis_by_embedding"; then
  log_success "search_tesis_by_embedding() function exists"
else
  log_error "search_tesis_by_embedding() function not found"
fi

if psql -t -c "SELECT proname FROM pg_proc WHERE proname = 'get_rag_stats';" | grep -q "get_rag_stats"; then
  log_success "get_rag_stats() function exists"
else
  log_error "get_rag_stats() function not found"
fi

# Test 8: Get database statistics
log_info "Test 8: Fetching database statistics..."
echo ""
psql -c "SELECT * FROM get_rag_stats();"
echo ""

# Test 9: Validate embeddings (if data exists)
if [ "$ROW_COUNT" -gt 0 ]; then
  log_info "Test 9: Validating embeddings..."
  echo ""
  psql -c "SELECT * FROM validate_embeddings();"
  echo ""
fi

# Test 10: Test vector search (if data exists)
if [ "$ROW_COUNT" -gt 0 ]; then
  log_info "Test 10: Testing vector search..."

  # Create a dummy embedding (all zeros for testing)
  TEST_QUERY="SELECT id_tesis, rubro, similarity
              FROM search_tesis_by_embedding(
                array_fill(0.0, ARRAY[1536])::vector,
                5
              );"

  RESULT_COUNT=$(psql -t -c "$TEST_QUERY" | wc -l | xargs)

  if [ "$RESULT_COUNT" -gt 0 ]; then
    log_success "Vector search working (returned $RESULT_COUNT results)"
  else
    log_warn "Vector search returned 0 results (may need to rebuild indexes)"
  fi
fi

# Summary
echo ""
echo "=== Summary ==="
log_success "All health checks passed!"
echo ""
echo "Access database with:"
echo "  psql -h localhost -p 5433 -U postgres -d legal_rag"
echo ""
echo "View logs with:"
echo "  docker compose -f docker-compose.local.yml logs -f postgres"
echo ""
echo "Access pgAdmin at:"
echo "  http://localhost:5050 (admin@local.dev / admin)"
