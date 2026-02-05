# Conversation Memory System

## Overview

The Legal RAG agent now supports conversation memory using Supabase for persistence. This enables:

- **Conversation continuity**: Resume conversations across sessions
- **Source reuse**: Avoid duplicate searches on follow-up questions
- **Context awareness**: Agent understands discussion history
- **Cost optimization**: Fewer embedding calls for follow-ups

## Quick Start

### Basic Usage

```python
from agent import run_agent

# New conversation
result = run_agent(
    user_query="¿Qué es el amparo indirecto?",
    user_id="user-uuid-from-supabase",
    conversation_id=None  # None = new conversation
)

# Save the conversation_id for follow-ups
conv_id = result['conversation_id']

# Follow-up question
result2 = run_agent(
    user_query="Dame más detalles",
    user_id="user-uuid-from-supabase",
    conversation_id=conv_id  # Continue same conversation
)
```

### Without Conversation Memory (Legacy Mode)

```python
# Works exactly as before
result = run_agent(
    user_query="¿Qué es el amparo?",
    # No user_id or conversation_id = no persistence
)
```

## Features

### 1. Intent Classification

The agent automatically classifies user intent:

**REUSE Intent** (uses historical sources, no new search):
- Follow-up questions: "explica más", "por qué", "dame detalles"
- Short queries after sources were provided
- Questions about previously discussed topics

**NEW_SEARCH Intent** (performs fresh search):
- Explicit search requests: "busca", "encuentra", "dame más tesis"
- New topics or different legal questions
- First query in conversation

### 2. Source Tracking

- **discussed_tesis**: Set of tesis IDs already mentioned
- **historical_sources**: Recent sources available for reuse
- **Diversity filter**: Avoids showing same tesis multiple times

### 3. Sliding Window

- Loads last **16 messages** (8 user+assistant pairs)
- Older messages are in Supabase but not loaded (prevents context overflow)
- Future: Add summarization for long conversations

## Data Model

### Supabase Schema

**conversations table**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `title`: Text (first query, truncated to 100 chars)
- `model`: Text (e.g., "gpt-4o-mini")
- `created_at`: Timestamp
- `updated_at`: Timestamp

**messages table**:
- `id`: UUID (primary key)
- `conversation_id`: UUID (foreign key to conversations)
- `role`: Text ("user" or "assistant")
- `content`: Text (message content)
- `sources`: JSONB (top 5 tesis sources with metadata)
- `created_at`: Timestamp

### Sources JSONB Format

```json
[
  {
    "id_tesis": 123456,
    "rubro": "AMPARO INDIRECTO...",
    "tipo_tesis": "Jurisprudencia",
    "epoca": "Undécima Época",
    "anio": 2024,
    "rank_score": 1150.5,
    "distance": 0.234
  }
]
```

## API Reference

### run_agent()

```python
def run_agent(
    user_query: str,
    max_iterations: int = 5,
    conversation_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> dict
```

**Parameters**:
- `user_query`: User's legal question
- `max_iterations`: Max search iterations (default: 5)
- `conversation_id`: Resume existing conversation (None = new)
- `user_id`: Supabase user UUID (required for persistence)

**Returns**:
```python
{
    "query": str,
    "conversation_id": str,  # NEW: UUID for future queries
    "results": List[TesisResult],
    "final_response": str,
    "sources_used": List[int],  # NEW: List of id_tesis used
    "metadata": {  # NEW: Conversation metadata
        "reused_sources": bool,
        "discussed_tesis_count": int,
        "total_messages": int
    },
    "iterations": int,
    "exit_reason": str,
    "llm_reasoning": str,
    "total_cost": float,
    "embedding_calls": int,
    "llm_calls": int
}
```

### ConversationManager

```python
from conversation import ConversationManager

cm = ConversationManager()

# Create conversation
conv_id = cm.create_conversation(
    user_id="uuid",
    title="User's first question",
    model="gpt-4o-mini"
)

# Load history
history = cm.load_conversation_history(conv_id, window_size=16)

# Save message
cm.save_message(
    conversation_id=conv_id,
    role="user",
    content="Question text",
    sources=None  # Only for assistant messages
)

# Extract discussed tesis
discussed = cm.extract_discussed_tesis(history)

# Extract historical sources
sources = cm.extract_historical_sources(history, max_sources=15)
```

### classify_intent_simple()

```python
from conversation import classify_intent_simple

should_reuse = classify_intent_simple(user_query, history)
# Returns: True = REUSE, False = NEW_SEARCH
```

## Cost Savings

### Example: Follow-up Question

**Without conversation memory**:
- Query 1: 1 embedding call + 2 LLM calls = $0.0014
- Query 2 (follow-up): 1 embedding call + 2 LLM calls = $0.0014
- **Total**: 2 embedding calls

**With conversation memory**:
- Query 1: 1 embedding call + 2 LLM calls = $0.0014
- Query 2 (follow-up, reused): 0 embedding calls + 2 LLM calls = $0.0012
- **Total**: 1 embedding call (50% savings)

For heavy users with many follow-ups, this can save significant costs.

## Testing

### Run Tests

```bash
cd rag_system
source venv/bin/activate

# Test conversation manager
python conversation.py

# Test full agent with conversation
python test_conversation.py
```

### Manual Testing

```python
from agent import run_agent
import uuid

# Generate test user
user_id = str(uuid.uuid4())

# First query
r1 = run_agent("¿Qué es amparo?", user_id=user_id)
conv_id = r1['conversation_id']

# Follow-up (should reuse)
r2 = run_agent("Dame más detalles", user_id=user_id, conversation_id=conv_id)
assert r2['metadata']['reused_sources'] == True

# New search (should search)
r3 = run_agent("Busca sobre suspensión", user_id=user_id, conversation_id=conv_id)
assert r3['metadata']['reused_sources'] == False
```

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=xxx
LOCAL_POSTGRES_PASSWORD=xxx
```

## Future Enhancements

1. **LLM-based intent classification**: Fallback for ambiguous cases
2. **Conversation summarization**: Compress history after 20+ messages
3. **Topic similarity**: Use embeddings for smarter source reuse
4. **Caching**: In-memory cache for recent conversations
5. **Batch operations**: Save user + assistant messages atomically
6. **Analytics**: Track reuse rate, conversation length, cost savings

## Migration Notes

### Breaking Changes
None. The system is fully backward compatible:
- Old code: Works without conversation_id/user_id
- New code: Add optional parameters for memory

### Database Setup
Ensure Supabase tables exist:
- `conversations` table
- `messages` table
- Proper RLS policies for user_id

## Troubleshooting

### "No conversation_id or user_id, skipping save"
- This is expected if you don't provide user_id
- Messages won't persist, but agent works normally

### "Connection refused" to Supabase
- Check `.env.local` has correct credentials
- Verify `SUPABASE_SERVICE_ROLE_KEY` (not ANON_KEY)

### Sources not reusing
- Check intent classification with `classify_intent_simple()`
- Ensure previous message had sources
- Try more explicit follow-up phrases

### High costs despite reuse
- Reuse only saves embedding calls (cheapest part)
- LLM calls still happen (majority of cost)
- Monitor `embedding_calls` in response
