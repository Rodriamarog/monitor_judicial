#!/bin/bash
# Manual Sync Script for Tribunal Electrónico
# Run this to manually trigger a sync check

echo "🔄 Starting manual Tribunal Electrónico sync..."
echo "================================================"
echo ""

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  echo "   Copy .env.example and fill in your credentials"
  exit 1
fi

# Run the sync script
npx tsx tribunal-sync.js

echo ""
echo "================================================"
echo "✅ Sync completed! Check the output above for results."
