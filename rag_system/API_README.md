# Legal RAG API Server

FastAPI server that exposes the Python RAG system as an HTTP API with streaming support.

## Quick Start

### 1. Install Dependencies

```bash
cd /home/rodrigo/code/monitor_judicial/rag_system
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start the Server

**Option A: Using the startup script (recommended)**
```bash
./start_api.sh
```

**Option B: Direct Python**
```bash
python api_server.py
```

**Option C: With uvicorn (more control)**
```bash
uvicorn api_server:app --reload --port 8000
```

The API will be available at:
- **API Base:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs (Interactive Swagger UI)
- **OpenAPI Spec:** http://localhost:8000/openapi.json

---

## API Endpoints

### 1. **POST /api/chat** (Main Endpoint)

Process user queries with the RAG system and stream responses.

**Request:**
```json
{
  "user_id": "3fb8db30-1e69-4944-b8f9-e1024357fade",
  "query": "¿Qué es el amparo indirecto?",
  "conversation_id": null,
  "max_iterations": 5
}
```

**Headers:**
```
Content-Type: application/json
X-API-Key: your-api-key (optional in development)
```

**Response:** Streaming Server-Sent Events (SSE)

```
data: {"type": "start", "conversation_id": "abc-123"}

data: {"type": "token", "content": "El amparo indirecto es..."}
data: {"type": "token", "content": " un medio de defensa..."}

data: {"type": "sources", "sources": [{...}, {...}]}

data: {"type": "metadata", "data": {"iterations": 2, "cost": 0.0014}}

data: {"type": "done"}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-secret-key" \
  -d '{
    "user_id": "3fb8db30-1e69-4944-b8f9-e1024357fade",
    "query": "¿Qué es el amparo indirecto?",
    "conversation_id": null,
    "max_iterations": 3
  }'
```

---

### 2. **POST /api/search** (Direct Search)

Search tesis without conversation context (useful for testing).

**Request:**
```bash
curl -X POST "http://localhost:8000/api/search?query=amparo%20indirecto&limit=5" \
  -H "X-API-Key: dev-secret-key"
```

**Response:**
```json
{
  "query": "amparo indirecto",
  "results": [
    {
      "id_tesis": 2030316,
      "rubro": "SUSPENSIÓN EN AMPARO INDIRECTO...",
      "texto": "...",
      "epoca": "Undécima Época",
      "tipo_tesis": "Jurisprudencia",
      "anio": 2024,
      "rank_score": 1205.45,
      "distance": 0.23
    }
  ]
}
```

---

### 3. **GET /api/health** (Health Check)

Check if the server is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "legal_rag"
}
```

---

## Testing the API

### Test 1: Health Check
```bash
curl http://localhost:8000/api/health
```

### Test 2: Simple Search
```bash
curl -X POST "http://localhost:8000/api/search?query=amparo&limit=3"
```

### Test 3: Chat Request
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "3fb8db30-1e69-4944-b8f9-e1024357fade",
    "query": "¿Procede el amparo contra actos municipales?",
    "conversation_id": null,
    "max_iterations": 2
  }'
```

### Test 4: Follow-up Question
```bash
# Use the conversation_id from the previous response
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "3fb8db30-1e69-4944-b8f9-e1024357fade",
    "query": "Dame más detalles",
    "conversation_id": "abc-123-from-previous-response",
    "max_iterations": 1
  }'
```

---

## Integration with Next.js (Vercel)

Update your Vercel API route to proxy to this server:

```typescript
// app/api/ai-assistant/chat/route.ts
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // 1. Validate user authentication
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse request
  const { message, conversationId } = await req.json();

  // 3. Forward to Python API
  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
  const response = await fetch(`${pythonApiUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.HETZNER_API_KEY || 'dev-secret-key'
    },
    body: JSON.stringify({
      user_id: user.id,
      query: message,
      conversation_id: conversationId,
      max_iterations: 5
    })
  });

  if (!response.ok) {
    throw new Error(`Python API error: ${response.statusText}`);
  }

  // 4. Stream back to client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Environment Variables for Vercel:**
```bash
# .env.local (Vercel)
PYTHON_API_URL=http://localhost:8000  # Local testing
# PYTHON_API_URL=http://hetzner-server:8000  # Production
HETZNER_API_KEY=your-secret-key
```

---

## Features

### ✅ Implemented
- **Streaming responses** via Server-Sent Events
- **Conversation management** (new + follow-up questions)
- **Source citations** with full metadata
- **Cost tracking** (embeddings + LLM calls)
- **Health checks** for monitoring
- **API key authentication** (optional in dev)
- **CORS support** for browser requests
- **Auto-reload** during development
- **Interactive API docs** (Swagger UI)

### 🎯 Enhancement Ideas (Future)
- **Rate limiting** (per user or API key)
- **Request queuing** for high load
- **Caching** (Redis for frequent queries)
- **Metrics** (Prometheus/Grafana)
- **Logging** (structured JSON logs)
- **WebSocket support** (alternative to SSE)

---

## Architecture

```
Frontend (Vercel Next.js)
        ↓ HTTP POST
Vercel API Route (/api/ai-assistant/chat/route.ts)
        ↓ HTTP POST (validate auth, proxy)
FastAPI Server (api_server.py) ← YOU ARE HERE
        ↓ Query
Python RAG Agent (agent.py)
        ↓ Vector search
Local Postgres (legal_rag database)
        ↓ Save conversations
Supabase (conversations, messages)
```

---

## Development Workflow

### 1. Start Python API
```bash
cd rag_system
./start_api.sh
```

### 2. Start Next.js (in another terminal)
```bash
cd /home/rodrigo/code/monitor_judicial
npm run dev
```

### 3. Test in Browser
- Navigate to http://localhost:3000
- Go to "AI Asistente Legal"
- Ask a question
- Watch the Python API logs in terminal

### 4. View API Docs
- Open http://localhost:8000/docs
- Try out endpoints interactively

---

## Troubleshooting

### Problem: "Module not found" errors
**Solution:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Problem: "Connection refused" from Vercel
**Solution:** Make sure Python API is running on port 8000:
```bash
curl http://localhost:8000/api/health
```

### Problem: "Unauthorized" errors
**Solution:** Check that `HETZNER_API_KEY` matches in both .env.local and Vercel

### Problem: Database connection errors
**Solution:** Ensure Postgres is running and `LOCAL_POSTGRES_PASSWORD` is set:
```bash
psql -h localhost -U rodrigo -d legal_rag -c "SELECT COUNT(*) FROM tesis_embeddings;"
```

### Problem: Streaming not working in browser
**Solution:** Check browser console for CORS errors. Update `allow_origins` in api_server.py:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    ...
)
```

---

## Deployment to Hetzner (Future)

When ready to deploy to production:

1. **Copy code to Hetzner:**
   ```bash
   rsync -avz rag_system/ user@hetzner-server:/app/rag_system/
   ```

2. **Install dependencies:**
   ```bash
   ssh user@hetzner-server
   cd /app/rag_system
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Run with Gunicorn (production):**
   ```bash
   gunicorn api_server:app \
     --workers 4 \
     --worker-class uvicorn.workers.UvicornWorker \
     --bind 0.0.0.0:8000 \
     --timeout 120
   ```

4. **Set up systemd service:**
   ```ini
   # /etc/systemd/system/legal-rag-api.service
   [Unit]
   Description=Legal RAG API
   After=network.target postgresql.service

   [Service]
   User=app
   WorkingDirectory=/app/rag_system
   ExecStart=/app/rag_system/venv/bin/gunicorn api_server:app \
     --workers 4 \
     --worker-class uvicorn.workers.UvicornWorker \
     --bind 0.0.0.0:8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

5. **Enable and start:**
   ```bash
   sudo systemctl enable legal-rag-api
   sudo systemctl start legal-rag-api
   sudo systemctl status legal-rag-api
   ```

---

## Performance

**Expected Response Times:**
- First query (new conversation): 3-5 seconds
- Follow-up query (with context): 2-3 seconds
- Direct search (no LLM): < 1 second

**Resource Usage:**
- **Memory:** ~500 MB (with LangGraph loaded)
- **CPU:** Spikes during LLM calls, low otherwise
- **Disk:** Minimal (streaming responses)

**Scaling:**
- **Vertical:** Increase Hetzner server RAM/CPU
- **Horizontal:** Multiple instances behind load balancer
- **Database:** Postgres handles 32k tesis easily

---

## Next Steps

1. ✅ **Test locally:** Start the API and test with cURL
2. ⏳ **Update Vercel:** Modify Next.js API route to call Python
3. ⏳ **Test end-to-end:** Use the UI to chat with Python RAG
4. ⏳ **Compare:** Test TypeScript vs Python responses side-by-side
5. ⏳ **Deploy:** Move to Hetzner when ready

**You're now ready to plug the Python RAG into your Next.js app! 🚀**
