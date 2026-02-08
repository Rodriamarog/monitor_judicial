#!/bin/bash
# Startup script for Legal RAG API Server

echo "========================================================================"
echo "🚀 Starting Legal RAG API Server"
echo "========================================================================"

# Activate virtual environment
source venv/bin/activate

# Check if dependencies need updating (optional, commented out by default)
# Uncomment if you've updated requirements.txt:
# echo "📦 Installing dependencies..."
# pip install -q -r requirements.txt

# Check if .env.local exists
if [ ! -f "/home/rodrigo/code/monitor_judicial/.env.local" ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "   Create /home/rodrigo/code/monitor_judicial/.env.local with:"
    echo "   - OPENAI_API_KEY"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - LOCAL_POSTGRES_PASSWORD"
    exit 1
fi

# Start the server
echo ""
echo "========================================================================"
echo "✅ Starting FastAPI server..."
echo "========================================================================"
echo "📍 API URL: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs (Swagger UI)"
echo "🔑 API Key: Set HETZNER_API_KEY in .env.local (optional for dev)"
echo ""
echo "Press CTRL+C to stop"
echo "========================================================================"
echo ""

python api_server.py
