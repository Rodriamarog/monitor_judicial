"""
FastAPI Server for Legal RAG System
Exposes the Python RAG agent as an HTTP API with streaming support
"""

import os
import json
import asyncio
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from agent import run_agent
from dotenv import load_dotenv

# Load environment variables
load_dotenv("/home/rodrigo/code/monitor_judicial/.env.local")

# Optional API key for security
API_SECRET_KEY = os.getenv("HETZNER_API_KEY", "dev-secret-key")


# ============================================================================
# Request/Response Models
# ============================================================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    user_id: str = Field(..., description="Supabase user UUID")
    query: str = Field(..., min_length=1, max_length=1000, description="User's question")
    conversation_id: Optional[str] = Field(None, description="Existing conversation UUID (null for new)")
    max_iterations: int = Field(5, ge=1, le=10, description="Maximum agentic iterations")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "3fb8db30-1e69-4944-b8f9-e1024357fade",
                "query": "¿Qué es el amparo indirecto?",
                "conversation_id": None,
                "max_iterations": 5
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    database: str


# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting Legal RAG API Server...")
    print(f"   API Key: {API_SECRET_KEY[:8]}...")
    print(f"   Supabase: {os.getenv('NEXT_PUBLIC_SUPABASE_URL')}")
    print(f"   Database: legal_rag @ localhost")

    yield

    # Shutdown
    print("🛑 Shutting down Legal RAG API Server...")


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Legal RAG API",
    description="AI-powered legal research assistant for Mexican jurisprudence",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware (configure for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Helper Functions
# ============================================================================

def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """Verify API key from header"""
    if os.getenv("ENVIRONMENT") == "development":
        return True  # Skip auth in development

    if x_api_key is None or x_api_key != API_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key"
        )
    return True


async def stream_response(result: dict) -> AsyncGenerator[str, None]:
    """
    Stream the RAG response as Server-Sent Events

    Format:
    data: {"type": "start", "conversation_id": "..."}
    data: {"type": "token", "content": "..."}
    data: {"type": "sources", "sources": [...]}
    data: {"type": "metadata", "data": {...}}
    data: {"type": "done"}
    """

    # Send conversation ID first
    yield f"data: {json.dumps({'type': 'start', 'conversation_id': result['conversation_id']})}\n\n"

    # Stream response content (simulate streaming by chunking)
    response = result['final_response']
    chunk_size = 50  # Characters per chunk

    for i in range(0, len(response), chunk_size):
        chunk = response[i:i + chunk_size]
        yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        await asyncio.sleep(0.01)  # Small delay for smoother streaming

    # Send sources
    sources_data = []
    for tesis_id in result['sources_used']:
        # Find the full source info from results
        source_info = next(
            (r for r in result['results'] if r.id_tesis == tesis_id),
            None
        )
        if source_info:
            sources_data.append({
                'id_tesis': source_info.id_tesis,
                'rubro': source_info.rubro,
                'tipo_tesis': source_info.tipo_tesis,
                'epoca': source_info.epoca,
                'anio': source_info.anio,
                'rank_score': source_info.rank_score,
                'distance': source_info.distance
            })

    yield f"data: {json.dumps({'type': 'sources', 'sources': sources_data})}\n\n"

    # Send metadata
    metadata = {
        'iterations': result['iterations'],
        'exit_reason': result['exit_reason'],
        'total_cost': result['total_cost'],
        'embedding_calls': result['embedding_calls'],
        'llm_calls': result['llm_calls'],
        'reused_sources': result['metadata']['reused_sources'],
        'discussed_tesis_count': result['metadata']['discussed_tesis_count']
    }
    yield f"data: {json.dumps({'type': 'metadata', 'data': metadata})}\n\n"

    # Send done signal
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "service": "Legal RAG API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "chat": "POST /api/chat",
            "health": "GET /api/health"
        }
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        database="legal_rag"
    )


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Main chat endpoint - processes user queries with the RAG system

    Returns streaming Server-Sent Events with:
    - Incremental response tokens
    - Source citations
    - Metadata (cost, iterations, etc.)
    """
    # Verify API key
    verify_api_key(x_api_key)

    try:
        print(f"\n{'='*70}")
        print(f"📥 Incoming request:")
        print(f"   User: {request.user_id}")
        print(f"   Query: {request.query}")
        print(f"   Conversation: {request.conversation_id or 'NEW'}")
        print(f"{'='*70}")

        # Run the RAG agent (synchronous, runs in thread pool)
        result = await asyncio.to_thread(
            run_agent,
            user_query=request.query,
            user_id=request.user_id,
            conversation_id=request.conversation_id,
            max_iterations=request.max_iterations
        )

        print(f"\n✅ Response generated:")
        print(f"   Conversation: {result['conversation_id']}")
        print(f"   Sources: {len(result['sources_used'])}")
        print(f"   Cost: ${result['total_cost']:.4f}")
        print(f"   Iterations: {result['iterations']}")

        # Stream the response
        return StreamingResponse(
            stream_response(result),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )

    except Exception as e:
        print(f"\n❌ Error processing request: {e}")
        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )


@app.post("/api/search")
async def search(
    query: str,
    limit: int = 10,
    x_api_key: Optional[str] = Header(None)
):
    """
    Direct search endpoint (no conversation, just search results)
    Useful for testing or building search UI
    """
    verify_api_key(x_api_key)

    try:
        from mcp_tools import search_and_rerank

        results = search_and_rerank(query, limit=limit)

        return {
            "query": query,
            "results": [
                {
                    "id_tesis": r.id_tesis,
                    "rubro": r.rubro,
                    "texto": r.texto[:500] + "..." if len(r.texto) > 500 else r.texto,
                    "epoca": r.epoca,
                    "tipo_tesis": r.tipo_tesis,
                    "anio": r.anio,
                    "rank_score": r.rank_score,
                    "distance": r.distance
                }
                for r in results
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {str(e)}"
        )


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    print(f"❌ Unhandled exception: {exc}")
    import traceback
    traceback.print_exc()

    return {
        "error": "Internal server error",
        "detail": str(exc),
        "status_code": 500
    }


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    """Run the server directly with uvicorn"""
    print("\n" + "="*70)
    print("🚀 Starting Legal RAG API Server")
    print("="*70)
    print("📍 URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("🔑 API Key: Set HETZNER_API_KEY in .env.local")
    print("="*70 + "\n")

    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
