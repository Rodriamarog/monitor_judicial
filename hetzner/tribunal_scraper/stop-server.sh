#!/bin/bash
# Stop Hetzner Validation Server
# Usage: ./stop-server.sh

echo "🛑 Stopping Hetzner Validation Server..."

if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  if kill -0 $PID 2>/dev/null; then
    kill $PID
    echo "✅ Server stopped (PID: $PID)"
    rm .server.pid
  else
    echo "⚠️  Server not running (stale PID file)"
    rm .server.pid
  fi
else
  # Fallback: kill by process name
  if pkill -f "tsx server.js"; then
    echo "✅ Server stopped"
  else
    echo "⚠️  No server process found"
  fi
fi
