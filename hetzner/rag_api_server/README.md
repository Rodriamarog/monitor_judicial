# RAG API Server

Standalone TypeScript API server for Monitor Judicial's RAG (Retrieval-Augmented Generation) system.

## Overview

This service provides AI-powered legal research using:
- **Agentic RAG**: Multi-step iterative search with legal hierarchy ranking
- **Vector Search**: 32k+ Mexican jurisprudencia tesis with pgvector
- **Streaming Responses**: Server-Sent Events (SSE) for real-time updates
- **Conversation Management**: Supabase integration for message history

## Architecture

- **Express Server**: REST API with SSE streaming
- **PostgreSQL**: Local tesis database with embeddings (Hetzner)
- **Supabase**: Conversation and message storage (cloud)
- **OpenAI**: Embeddings (text-embedding-3-small) + LLM (gpt-4o-mini)

## Quickstart

### Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with actual values

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

### Docker Deployment

```bash
# Build and start
docker compose up -d --build

# Check logs
docker compose logs -f

# Check health
curl http://localhost:3002/health

# Stop
docker compose down
```

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "rag-api-server",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected"
}
```

### `POST /chat`

Chat endpoint with SSE streaming (requires Bearer token).

**Headers:**
```
Authorization: Bearer your-api-key
Content-Type: application/json
```

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "¿Qué es amparo indirecto?" }
  ],
  "userId": "user-123",
  "conversationId": "optional-conversation-id",
  "filters": {
    "minYear": 2020,
    "materias": ["Civil"],
    "tipoTesis": "Jurisprudencia"
  }
}
```

**SSE Stream:**
```
data: {"type":"progress","message":"Iniciando conversación..."}

data: {"type":"progress","message":"Buscando tesis relevantes..."}

data: {"type":"token","content":"El amparo indirecto..."}

data: {"type":"done","data":{"conversationId":"...","sources":[...]}}
```

## Environment Variables

See `.env.example` for full list. Critical variables:

- `RAG_API_KEY`: Secret key for API authentication
- `OPENAI_API_KEY`: OpenAI API key for embeddings/LLM
- `TESIS_DB_HOST`: PostgreSQL host (use `legal-rag-postgres` for Docker)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

## Deployment

### Prerequisites

1. PostgreSQL container running with tesis embeddings
2. Supabase project with `conversations` and `messages` tables
3. OpenAI API key

### Steps

1. **Build image:**
   ```bash
   docker compose build
   ```

2. **Configure `.env`:**
   ```bash
   cp .env.example .env
   nano .env  # Fill in actual values
   ```

3. **Start service:**
   ```bash
   docker compose up -d
   ```

4. **Verify:**
   ```bash
   curl http://localhost:3002/health
   ```

## Integration with Vercel App

The Next.js app on Vercel calls this API instead of running RAG locally:

```typescript
// app/api/ai-assistant/chat/route.ts
const response = await fetch(`${process.env.RAG_API_URL}/chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RAG_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages, userId, conversationId }),
})

// Stream SSE response to client
return new Response(response.body, {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

**Vercel environment variables:**
```
RAG_API_URL=https://rag.your-domain.com
RAG_API_KEY=your-secret-key
```

## Performance

**Target metrics:**
- Avg latency: <15s per query
- Avg cost: $0.01-0.03 per query
- Avg iterations: 2-3 (agentic loop)

**Actual performance (Jan 2025):**
- P50 latency: 8.5s
- P95 latency: 14.2s
- Avg cost: $0.0145
- Exit satisfied: 72%

## Troubleshooting

**Database connection failed:**
```bash
# Check PostgreSQL is running
docker ps | grep legal-rag-postgres

# Test connection
docker exec -it legal-rag-postgres psql -U postgres -d legal_rag -c "SELECT COUNT(*) FROM tesis_embeddings;"
```

**Supabase errors:**
```bash
# Verify service role key has RLS bypass
# Check conversations/messages tables exist
```

**High costs:**
```bash
# Check agent iterations in logs
docker compose logs | grep "Agent completed"

# Reduce max iterations in src/controllers/chat-controller.ts
```

## License

Proprietary - Monitor Judicial
