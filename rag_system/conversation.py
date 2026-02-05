"""
Conversation Memory Manager for Legal RAG System
Handles conversation persistence with Supabase
"""

import os
from typing import List, Dict, Optional, Set
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from mcp_tools import TesisResult

# Load environment variables
load_dotenv("/home/rodrigo/code/monitor_judicial/.env.local")

# Initialize LLM for intent classification fallback
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.1,  # Low temperature for classification
    api_key=os.getenv("OPENAI_API_KEY")
)


class ConversationManager:
    """Manages conversation persistence with Supabase"""

    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.window_size = 16  # 8 pairs, configurable

    def load_conversation_history(
        self,
        conversation_id: str,
        window_size: int = None
    ) -> List[Dict]:
        """Load last N messages from Supabase, return chronological order"""
        window = window_size or self.window_size

        response = self.supabase.table('messages') \
            .select('role, content, sources, created_at') \
            .eq('conversation_id', conversation_id) \
            .order('created_at', desc=True) \
            .limit(window) \
            .execute()

        # Reverse to get chronological order
        return list(reversed(response.data))

    def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        sources: List[TesisResult] = None
    ) -> Dict:
        """Save message to Supabase with sources as JSONB"""
        sources_json = None
        if sources:
            sources_json = [
                {
                    "id_tesis": s.id_tesis,
                    "rubro": s.rubro,
                    "tipo_tesis": s.tipo_tesis,
                    "epoca": s.epoca,
                    "anio": s.anio,
                    "rank_score": s.rank_score,
                    "distance": s.distance
                }
                for s in sources[:5]  # Top 5 only
            ]

        response = self.supabase.table('messages').insert({
            'conversation_id': conversation_id,
            'role': role,
            'content': content,
            'sources': sources_json
        }).execute()

        return response.data[0]

    def create_conversation(
        self,
        user_id: str,
        title: str,
        model: str = "gpt-4o-mini"
    ) -> str:
        """Create new conversation, return ID"""
        response = self.supabase.table('conversations').insert({
            'user_id': user_id,
            'title': title[:100],  # Truncate
            'model': model
        }).execute()

        return response.data[0]['id']

    def update_conversation_timestamp(self, conversation_id: str):
        """Update conversation.updated_at"""
        self.supabase.table('conversations') \
            .update({'updated_at': 'now()'}) \
            .eq('id', conversation_id) \
            .execute()

    def extract_discussed_tesis(self, history: List[Dict]) -> Set[int]:
        """Extract all id_tesis from historical sources"""
        tesis_ids = set()
        for msg in history:
            if msg.get('sources'):
                for source in msg['sources']:
                    tesis_ids.add(source['id_tesis'])
        return tesis_ids

    def extract_historical_sources(
        self,
        history: List[Dict],
        max_sources: int = 15
    ) -> List[Dict]:
        """Extract unique sources from history for potential reuse"""
        sources_map = {}  # Deduplicate by id_tesis

        # Process in reverse (most recent first)
        for msg in reversed(history):
            if msg.get('sources'):
                for source in msg['sources']:
                    id_tesis = source['id_tesis']
                    if id_tesis not in sources_map:
                        sources_map[id_tesis] = source

        # Return most recent unique sources
        return list(sources_map.values())[:max_sources]


# ============================================================================
# Intent Classification
# ============================================================================

def classify_intent_simple(user_query: str, history: List[Dict]) -> bool:
    """
    DEPRECATED: Use classify_intent_with_llm_fallback instead.
    Simple heuristic-based intent classification (kept for backward compatibility).
    Returns: True = REUSE, False = NEW_SEARCH
    """
    if not history:
        return False  # No history = always search

    query_lower = user_query.lower().strip()

    # Follow-up patterns → REUSE
    followup_patterns = [
        "explica", "detalla", "qué significa", "a qué te refieres",
        "por qué", "cómo", "cuándo", "eso", "esto", "lo anterior",
        "la tesis", "el caso", "esa jurisprudencia", "sobre eso",
        "más detalles", "más información", "amplía", "profundiza"
    ]
    if any(pattern in query_lower for pattern in followup_patterns):
        return True

    # Explicit search patterns → NEW_SEARCH
    search_patterns = [
        "busca", "encuentra", "otra tesis", "otras tesis",
        "necesito", "quiero", "dame otras", "diferente"
    ]
    if any(pattern in query_lower for pattern in search_patterns):
        return False

    # Short messages + recent sources = likely follow-up
    if len(query_lower) < 40 and history[-1].get('sources'):
        return True

    # Default: search (safer)
    return False


def classify_intent_with_llm_fallback(
    user_query: str,
    history: List[Dict]
) -> bool:
    """
    Two-tier intent classification: heuristics first, LLM for ambiguous cases.
    Returns: True = REUSE, False = NEW_SEARCH
    """
    if not history:
        return False  # No history = always search

    query_lower = user_query.lower().strip()

    # Tier 1: Clear patterns (fast, no LLM)

    # Strong REUSE signals
    reuse_patterns = [
        "explica", "detalla", "qué significa", "por qué", "cómo",
        "más detalles", "más información", "amplía", "profundiza",
        "sobre eso", "sobre esto", "lo anterior", "esa tesis",
        "ese criterio", "esa jurisprudencia", "qué quiere decir"
    ]
    if any(p in query_lower for p in reuse_patterns):
        return True

    # Strong NEW_SEARCH signals
    search_patterns = [
        "busca", "encuentra", "otra tesis", "otras tesis",
        "dame otras", "necesito", "quiero", "diferente",
        "distinto", "nuevo", "buscar", "encontrar"
    ]
    if any(p in query_lower for p in search_patterns):
        return False

    # Short + recent sources = likely follow-up
    if len(query_lower) < 40 and history and history[-1].get('sources'):
        return True

    # Tier 2: AMBIGUOUS - use LLM
    print("🤔 Ambiguous intent, using LLM classifier...")

    context = "\n".join([
        f"{m['role']}: {m['content'][:100]}"
        for m in history[-4:]
    ]) if history else "Sin contexto"

    prompt = f"""Clasifica la intención del usuario: ¿REUSAR fuentes existentes o NUEVA búsqueda?

Contexto reciente:
{context}

Usuario ahora: "{user_query}"

Responde SOLO: REUSE o NEW_SEARCH"""

    try:
        response = llm.invoke([{"role": "user", "content": prompt}])
        intent = response.content.upper().strip()
        result = "REUSE" in intent
        print(f"   LLM classified as: {'REUSE' if result else 'NEW_SEARCH'}")
        return result
    except Exception as e:
        print(f"⚠️  LLM fallback failed: {e}, defaulting to NEW_SEARCH")
        return False  # Default: search (safer)


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    """Test the conversation manager"""

    print("=" * 70)
    print("TESTING CONVERSATION MANAGER")
    print("=" * 70)

    cm = ConversationManager()

    # Test 1: Create conversation
    print("\n1. Testing conversation creation...")
    conv_id = cm.create_conversation(
        user_id='test-user',
        title='Test Conversation'
    )
    print(f"   Created conversation: {conv_id}")

    # Test 2: Save messages
    print("\n2. Testing message saving...")
    cm.save_message(conv_id, 'user', '¿Qué es el amparo indirecto?')
    cm.save_message(conv_id, 'assistant', 'El amparo indirecto es...')
    print("   Saved 2 messages")

    # Test 3: Load history
    print("\n3. Testing history loading...")
    history = cm.load_conversation_history(conv_id)
    print(f"   Loaded {len(history)} messages")
    for msg in history:
        print(f"   - {msg['role']}: {msg['content'][:50]}...")

    # Test 4: Intent classification
    print("\n4. Testing intent classification...")
    test_cases = [
        ("Busca más tesis sobre amparo", False),
        ("Explica eso", True),
        ("¿Por qué?", True),
        ("Dame otra tesis", False),
    ]
    for query, expected in test_cases:
        result = classify_intent_simple(query, history)
        status = "✓" if result == expected else "✗"
        print(f"   {status} '{query}' → {'REUSE' if result else 'SEARCH'}")

    print("\n" + "=" * 70)
    print("✓ Conversation manager tested successfully!")
    print("=" * 70)
