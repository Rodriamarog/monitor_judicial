#!/bin/bash
# Monitor Judicial - Smart Deployment Script
# Auto-detects available postgres port (5432 or 5433)
# Auto-restores database if empty or missing HNSW indexes

set -e

cd "$(dirname "$0")"

# Function to check if port is available
port_available() {
    ! nc -z localhost $1 2>/dev/null
}

# Determine postgres port
if port_available 5432; then
    POSTGRES_PORT=5432
    echo "✅ Port 5432 available, using standard postgres port"
else
    POSTGRES_PORT=5433
    echo "⚠️  Port 5432 in use, using fallback port 5433"
fi

# Export for docker-compose
export POSTGRES_PORT

# Create volumes if they don't exist
echo "📦 Ensuring Docker volumes exist..."
docker volume create legal-rag-postgres-data >/dev/null 2>&1 || true
docker volume create legal-rag-pgadmin-data >/dev/null 2>&1 || true

# Start services
echo "🚀 Starting services with postgres on port $POSTGRES_PORT..."
docker compose -f docker-compose.production.yml up -d "$@"

# Wait for postgres to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec legal-rag-postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    sleep 1
done

# Check database status
echo "🔍 Checking database status..."

# Check if table exists and has data
TESIS_COUNT=$(docker exec legal-rag-postgres psql -U postgres -d legal_rag -t -c "SELECT COUNT(*) FROM tesis_embeddings;" 2>/dev/null | tr -d ' ' || echo "0")

# Check if HNSW indexes exist (specifically for vector similarity search)
HNSW_COUNT=$(docker exec legal-rag-postgres psql -U postgres -d legal_rag -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename='tesis_embeddings' AND indexdef LIKE '%USING hnsw%';" 2>/dev/null | tr -d ' ' || echo "0")

NEEDS_RESTORE=false

if [ "$TESIS_COUNT" = "0" ]; then
    echo "⚠️  Database is empty (0 tesis)"
    NEEDS_RESTORE=true
elif [ "$HNSW_COUNT" != "2" ]; then
    echo "⚠️  Database has $TESIS_COUNT tesis but missing HNSW indexes (found $HNSW_COUNT, expected 2)"
    NEEDS_RESTORE=true
else
    echo "✅ Database has $TESIS_COUNT tesis with $HNSW_COUNT HNSW indexes"
fi

if [ "$NEEDS_RESTORE" = true ]; then
    echo "📦 Restoring database from backup..."
    
    # Stop postgres for restore
    docker compose -f docker-compose.production.yml stop postgres
    
    # Run restore script
    cd postgres
    bash restore-volume.sh
    cd ..
    
    # Restart postgres
    export POSTGRES_PORT
    docker compose -f docker-compose.production.yml up -d postgres
    
    # Wait for postgres again
    echo "⏳ Waiting for PostgreSQL after restore..."
    sleep 10
    
    # Verify restoration
    TESIS_COUNT=$(docker exec legal-rag-postgres psql -U postgres -d legal_rag -t -c "SELECT COUNT(*) FROM tesis_embeddings;" 2>/dev/null | tr -d ' ' || echo "0")
    HNSW_COUNT=$(docker exec legal-rag-postgres psql -U postgres -d legal_rag -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename='tesis_embeddings' AND indexdef LIKE '%USING hnsw%';" 2>/dev/null | tr -d ' ' || echo "0")
    
    echo "✅ Database restored: $TESIS_COUNT tesis, $HNSW_COUNT HNSW indexes"
fi

# Wait for all health checks
echo "⏳ Waiting for all services to become healthy..."
sleep 5

# Show status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.production.yml ps

echo ""
echo "✅ Deployment complete!"
echo "   - PostgreSQL: localhost:$POSTGRES_PORT ($TESIS_COUNT tesis, $HNSW_COUNT HNSW indexes)"
echo "   - RAG API: http://localhost:3002"
echo "   - Tribunal Scraper: http://localhost:3001"
echo "   - pgAdmin: http://localhost:5050"
