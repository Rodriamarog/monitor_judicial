#!/bin/bash
# Monitor Judicial - Stop All Services

echo "🛑 Stopping all services..."
docker compose -f docker-compose.production.yml down

echo "✅ All services stopped"
echo ""
echo "Note: Data is preserved in volumes. Use './start.sh' to restart."
