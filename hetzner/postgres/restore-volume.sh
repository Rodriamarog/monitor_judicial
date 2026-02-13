#!/bin/bash
# Monitor Judicial - PostgreSQL Volume Restore Script
# Restores postgres data from backup volume to running container
#
# Usage:
#   ./restore-volume.sh [backup-file.tar.gz]
#
# Default: data-backup/postgres-data-backup.tar.gz

set -e

BACKUP_FILE="${1:-data-backup/postgres-data-backup.tar.gz}"
VOLUME_NAME="legal-rag-postgres-data"
CONTAINER_NAME="legal-rag-postgres"

echo "========================================="
echo "PostgreSQL Volume Restore"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "Target volume: $VOLUME_NAME"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  Warning: Container $CONTAINER_NAME is running"
    read -p "Stop container and continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    echo "Stopping container..."
    docker stop $CONTAINER_NAME
fi

# Check if volume exists
if ! docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
    echo "📦 Creating volume $VOLUME_NAME..."
    docker volume create $VOLUME_NAME
fi

# Restore backup
echo "📥 Restoring backup to volume..."
docker run --rm \
    -v $VOLUME_NAME:/data \
    -v "$(pwd)/$BACKUP_FILE:/backup.tar.gz:ro" \
    alpine sh -c "
        cd /data &&
        rm -rf * &&
        tar xzf /backup.tar.gz &&
        echo '✅ Restore complete. Files extracted:'
        ls -lh | head -10
    "

echo ""
echo "========================================="
echo "✅ Volume restore complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Start postgres container: docker compose -f docker-compose.production.yml up -d postgres"
echo "  2. Verify data: docker exec legal-rag-postgres psql -U postgres -d legal_rag -c 'SELECT COUNT(*) FROM tesis;'"
echo "  3. Expected: 91,634 rows"
echo ""
