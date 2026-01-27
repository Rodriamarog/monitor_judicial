#!/bin/bash
# Start Hetzner Validation Server
# Usage: ./start-server.sh

cd "$(dirname "$0")"

echo "🚀 Starting Hetzner Validation Server..."

# Kill any existing server
pkill -f "tsx server.js" 2>/dev/null && echo "Stopped existing server"

# Start server in background with logging
npx tsx server.js > logs/server.log 2>&1 &
SERVER_PID=$!

sleep 2

# Check if server started successfully
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Server started successfully (PID: $SERVER_PID)"
  echo "📊 Health: http://localhost:3001/health"
  echo "📝 Logs: tail -f logs/server.log"
  echo $SERVER_PID > .server.pid
else
  echo "❌ Server failed to start. Check logs/server.log"
  exit 1
fi
