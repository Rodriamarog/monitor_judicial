"""
LangGraph Agent for Legal RAG System
Implements agentic search with LLM-driven iteration control
"""

import os
import json
from typing import TypedDict, List, Annotated, Literal, Optional, Set
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from mcp_tools import (
    search_and_rerank,
    TesisResult,
    get_tesis_full,
    merge_sources
)

# Load environment variables
load_dotenv("/home/rodrigo/code/monitor_judicial/.env.local")

# Initialize LLM
llm = ChatOpenAI(
    model="gpt-4o-mini",  # Fast and cost-effective
    temperature=0.3,      # Balanced creativity
    api_key=os.getenv("OPENAI_API_KEY")
)


# ============================================================================
# Agent State Definition
# ============================================================================

class AgentState(TypedDict):
    """State that persists across agent iterations"""
    # Input
    user_query: str

    # Iteration tracking
    iteration: int
    max_iterations: int
    query_history: List[str]
    current_query: str

    # Results
    current_results: List[TesisResult]
    all_results_history: List[List[TesisResult]]

    # LLM decisions
    satisfecho: bool
    decision: str  # SATISFECHO, REFINAR, AMPLIAR, FILTRAR
    razonamiento: str
    siguiente_consulta: str
    confianza: float

    # Cost tracking
    total_cost: float
    embedding_calls: int
    llm_calls: int

    # Exit reason
    exit_reason: str

    # Final output
    final_response: str

    # NEW: Conversation memory fields
    conversation_id: Optional[str]        # Supabase conversation UUID
    user_id: Optional[str]                # Supabase user UUID
    conversation_history: List[dict]      # Last 16 messages
    discussed_tesis: Set[int]             # IDs already discussed
    historical_sources: List[dict]        # Sources from history
    should_reuse_sources: bool            # Intent: reuse vs new search


# ============================================================================
# Cost Tracking
# ============================================================================

def update_cost(state: AgentState, embedding_calls: int = 0, llm_calls: int = 0) -> AgentState:
    """Update cost tracking in state"""
    # OpenAI Costs (per 1K tokens)
    EMBEDDING_COST_PER_1K = 0.00002  # text-embedding-3-small
    LLM_INPUT_COST_PER_1K = 0.00015  # gpt-4o-mini input
    LLM_OUTPUT_COST_PER_1K = 0.0006  # gpt-4o-mini output

    # Average tokens per call
    AVG_EMBEDDING_TOKENS = 20  # Short queries
    AVG_LLM_INPUT_TOKENS = 1000  # Context + results
    AVG_LLM_OUTPUT_TOKENS = 500  # Response

    state["embedding_calls"] += embedding_calls
    state["llm_calls"] += llm_calls

    # Calculate actual costs
    embedding_cost = embedding_calls * (AVG_EMBEDDING_TOKENS / 1000) * EMBEDDING_COST_PER_1K
    llm_input_cost = llm_calls * (AVG_LLM_INPUT_TOKENS / 1000) * LLM_INPUT_COST_PER_1K
    llm_output_cost = llm_calls * (AVG_LLM_OUTPUT_TOKENS / 1000) * LLM_OUTPUT_COST_PER_1K

    state["total_cost"] += embedding_cost + llm_input_cost + llm_output_cost
    return state


# ============================================================================
# Helper Functions
# ============================================================================

def format_results_for_llm(results: List[TesisResult]) -> str:
    """Formatear resultados para evaluación del LLM"""
    if not results:
        return "No se encontraron resultados."

    formatted = []
    for i, r in enumerate(results[:10], 1):
        formatted.append(f"""
Resultado {i}:
- ID: {r.id_tesis}
- Época: {r.epoca}
- Tipo: {r.tipo_tesis}
- Instancia: {r.instancia or 'N/A'}
- Año: {r.anio or 'N/A'}
- Puntuación Jerárquica: {r.rank_score:.2f}
- Similitud Semántica: {(1 - r.distance):.1%}
- Rubro: {r.rubro[:150]}...
""")

    return "\n".join(formatted)


# ============================================================================
# Agent Nodes
# ============================================================================

def load_context_node(state: AgentState) -> AgentState:
    """Load conversation history and context before search"""
    from conversation import ConversationManager, classify_intent_with_llm_fallback

    conv_manager = ConversationManager()

    if state["conversation_id"]:
        print(f"📚 Loading conversation history: {state['conversation_id']}")

        # Load history from Supabase
        history = conv_manager.load_conversation_history(state["conversation_id"])
        state["conversation_history"] = history
        print(f"   Loaded {len(history)} messages")

        # Extract discussed tesis
        state["discussed_tesis"] = conv_manager.extract_discussed_tesis(history)
        print(f"   Found {len(state['discussed_tesis'])} discussed tesis")

        # Extract historical sources for potential reuse
        state["historical_sources"] = conv_manager.extract_historical_sources(history)
        print(f"   Extracted {len(state['historical_sources'])} unique sources")

        # Classify intent with LLM fallback
        state["should_reuse_sources"] = classify_intent_with_llm_fallback(
            state["user_query"],
            history
        )
        intent = "REUSE" if state["should_reuse_sources"] else "NEW_SEARCH"
        print(f"   Intent classified as: {intent}")
    else:
        # New conversation
        print("📝 Starting new conversation")
        state["conversation_history"] = []
        state["discussed_tesis"] = set()
        state["historical_sources"] = []
        state["should_reuse_sources"] = False

    return state


def rewrite_query_node(state: AgentState) -> AgentState:
    """Rewrite ambiguous queries with conversation context"""

    # Skip if query is self-contained (>100 chars) or no history
    if len(state["user_query"]) > 100 or not state["conversation_history"]:
        state["current_query"] = state["user_query"]
        return state

    # Get last 6 messages (3 pairs) for context
    recent = state["conversation_history"][-6:]
    context = "\n".join([
        f"{m['role'].title()}: {m['content'][:150]}"
        for m in recent
    ])

    prompt = f"""Reescribe esta consulta legal agregando contexto de la conversación.

CONSULTA ORIGINAL: "{state['user_query']}"

CONTEXTO RECIENTE:
{context}

REGLAS:
- Si la consulta es clara y específica, responde: ORIGINAL
- Si es ambigua o hace referencia a mensajes anteriores, reescríbela como pregunta autónoma
- Incluye términos legales específicos mencionados antes
- Mantén concisa (max 150 caracteres)
- Incluye materia/área legal si está implícita

CONSULTA REESCRITA (o "ORIGINAL"):"""

    try:
        response = llm.invoke([{"role": "user", "content": prompt}])
        rewritten = response.content.strip()

        if rewritten != "ORIGINAL" and len(rewritten) > 10:
            print(f"🔄 Query rewriting:")
            print(f"   Original: {state['user_query']}")
            print(f"   Rewritten: {rewritten}")
            state["current_query"] = rewritten
            state = update_cost(state, llm_calls=1)
        else:
            state["current_query"] = state["user_query"]
    except Exception as e:
        print(f"⚠️  Query rewriting failed: {e}, using original")
        state["current_query"] = state["user_query"]

    return state


def search_node(state: AgentState) -> AgentState:
    """Execute search with optional source merging"""
    print(f"\n{'='*70}")
    print(f"🔍 Iteración {state['iteration']}: Buscando '{state['current_query']}'")
    print(f"{'='*70}")

    # Hybrid approach: merge new + historical sources
    if state["should_reuse_sources"] and state["historical_sources"] and state["iteration"] == 1:
        print(f"🔄 Hybrid search: combining new + historical sources")

        # Small fresh search (5 results)
        new_results = search_and_rerank(
            query=state["current_query"],
            limit=5
        )

        # Merge with historical sources (up to 10 total)
        merged = merge_sources(
            new_sources=new_results,
            historical_sources=state["historical_sources"],
            max_sources=10
        )

        state["current_results"] = merged
        state["all_results_history"].append(merged)
        state["query_history"].append(state["current_query"])

        # Still did 1 embedding call for new search
        state = update_cost(state, embedding_calls=1)

        print(f"   Merged: {len(new_results)} new + {len(state['historical_sources'])} historical = {len(merged)} total")
        if merged:
            print(f"   Mejor resultado: [{merged[0].tipo_tesis}] {merged[0].rubro[:80]}...")

        return state

    # Full new search
    print(f"🔍 Full semantic search...")
    results = search_and_rerank(state["current_query"], limit=10)

    # Filter out already-discussed tesis for diversity
    if state["discussed_tesis"]:
        filtered = [r for r in results if r.id_tesis not in state["discussed_tesis"]]
        removed = len(results) - len(filtered)
        if removed > 0:
            print(f"   Filtered out {removed} already-discussed tesis")
        results = filtered

    # Actualizar estado
    state["current_results"] = results
    state["all_results_history"].append(results)
    state["query_history"].append(state["current_query"])

    # Actualizar costos (1 embedding call para la consulta)
    state = update_cost(state, embedding_calls=1)

    print(f"   Encontrados {len(results)} resultados")
    if results:
        print(f"   Mejor resultado: [{results[0].tipo_tesis}] {results[0].rubro[:80]}...")

    return state


def evaluate_node(state: AgentState) -> AgentState:
    """LLM evalúa los resultados y decide si continuar"""
    results_summary = format_results_for_llm(state["current_results"])

    prompt = f"""Eres un asistente de investigación jurídica mexicana experto en tesis y jurisprudencia.

CONSULTA ORIGINAL DEL USUARIO: "{state['user_query']}"

CONSULTA DE BÚSQUEDA ACTUAL (Iteración {state['iteration']}): "{state['current_query']}"

RESULTADOS OBTENIDOS:
{results_summary}

INSTRUCCIONES:
Evalúa estos resultados y decide si son suficientes para responder la consulta del usuario.

CRITERIOS DE EVALUACIÓN:
1. **Relevancia**: ¿Las tesis están relacionadas con la consulta?
2. **Autoridad**: ¿Tenemos Jurisprudencia de la 11ª Época? (es lo más autoritativo)
3. **Cantidad**: ¿Tenemos al menos 3-5 tesis de calidad?
4. **Completitud**: ¿Podemos responder la pregunta del usuario con estos resultados?

JERARQUÍA LEGAL (recuerda siempre):
- 11ª Época > 10ª Época (más reciente prevalece)
- Jurisprudencia > Tesis Aislada (obligatoria vs orientadora)
- SCJN > Plenos Regionales > Tribunales Colegiados

DECISIONES POSIBLES:
- **SATISFECHO**: Tenemos resultados suficientes y de alta calidad
- **REFINAR**: Resultados parciales, pero necesitamos palabras clave más específicas
- **AMPLIAR**: Muy pocos resultados, necesitamos búsqueda más amplia
- **FILTRAR**: Demasiados resultados irrelevantes, necesitamos ser más específicos

Si NO estás satisfecho:
- Proporciona una nueva consulta de búsqueda diferente
- Explica por qué la nueva consulta será mejor
- NO repitas la misma consulta o consultas anteriores: {state['query_history']}

Responde SOLO en formato JSON:
{{
    "satisfecho": true/false,
    "decision": "SATISFECHO|REFINAR|AMPLIAR|FILTRAR",
    "razonamiento": "explicación detallada de tu decisión",
    "siguiente_consulta": "nueva consulta si no satisfecho, sino null",
    "confianza": 0.0-1.0
}}"""

    # LLM evalúa
    response = llm.invoke([{"role": "user", "content": prompt}])

    # Parsear respuesta JSON
    try:
        decision = json.loads(response.content)
    except json.JSONDecodeError:
        # Fallback si el LLM no responde en JSON válido
        print("⚠ LLM no respondió en JSON válido, asumiendo satisfecho")
        decision = {
            "satisfecho": True,
            "decision": "SATISFECHO",
            "razonamiento": "Error en parseo, usando resultados actuales",
            "siguiente_consulta": None,
            "confianza": 0.5
        }

    # Actualizar estado
    state["satisfecho"] = decision.get("satisfecho", False)
    state["decision"] = decision.get("decision", "SATISFECHO")
    state["razonamiento"] = decision.get("razonamiento", "")
    state["siguiente_consulta"] = decision.get("siguiente_consulta", "")
    state["confianza"] = decision.get("confianza", 0.5)

    # Actualizar costos (1 LLM call)
    state = update_cost(state, llm_calls=1)

    # Logging
    print(f"\n💭 Decisión del LLM: {state['decision']}")
    print(f"   Razonamiento: {state['razonamiento'][:150]}...")
    print(f"   Confianza: {state['confianza']:.0%}")
    if state['siguiente_consulta']:
        print(f"   Siguiente consulta sugerida: '{state['siguiente_consulta']}'")

    return state


def prepare_next_iteration(state: AgentState) -> AgentState:
    """Preparar la siguiente iteración"""
    state["iteration"] += 1
    state["current_query"] = state["siguiente_consulta"]
    return state


def generate_response_node(state: AgentState) -> AgentState:
    """Generar respuesta final citando las tesis encontradas"""
    print(f"\n{'='*70}")
    print(f"📝 Generando respuesta final...")
    print(f"{'='*70}")

    # Tomar las mejores 5 tesis
    top_results = state["current_results"][:5]

    if not top_results:
        state["final_response"] = "No se encontraron tesis relevantes para responder la consulta."
        return state

    # Formatear tesis para el LLM con más detalle
    tesis_details = []
    for i, r in enumerate(top_results, 1):
        # Obtener texto completo si es necesario
        full_tesis = get_tesis_full(r.id_tesis)

        tesis_info = f"""
=== TESIS {i} ===
ID: {r.id_tesis}
Rubro: {r.rubro}
Tipo: {r.tipo_tesis}
Época: {r.epoca}
Instancia: {r.instancia or 'N/A'}
Año: {r.anio or 'N/A'}
Registro: {r.tesis or 'N/A'}
Localización: {r.localizacion or 'N/A'}

Texto:
{r.texto}

Precedentes:
{full_tesis.get('precedentes', 'N/A') if full_tesis else 'N/A'}
"""
        tesis_details.append(tesis_info)

    tesis_context = "\n".join(tesis_details)

    prompt = f"""Eres un asistente legal AI experto en derecho mexicano. Responde directamente al usuario.

CONSULTA DEL USUARIO: "{state['user_query']}"

Se encontraron las siguientes tesis jurisprudenciales relevantes:

{tesis_context}

INSTRUCCIONES:
1. Responde DIRECTAMENTE al usuario (no generes emails ni documentos formales)
2. NO uses saludos formales como "Estimado usuario" ni despedidas como "Atentamente"
3. NO incluyas campos de firma o información de contacto
4. Eres un AI asistente, no pretendas ser un abogado humano
5. Cita las tesis específicas (menciona el Rubro y Registro cuando sea posible)
6. Explica los principios jurídicos relevantes
7. Indica la jerarquía de las fuentes (Jurisprudencia > Tesis Aislada)
8. Menciona si hay criterios de la 11ª Época (más recientes y vinculantes)
9. Si hay múltiples tesis, explica cómo se relacionan o complementan
10. Sé claro, conciso y directo (máximo 500 palabras)

TONO:
- Profesional pero conversacional
- Usa lenguaje jurídico pero accesible
- Responde como un asistente AI útil, no como un abogado escribiendo documentos

Responde la consulta del usuario ahora."""

    response = llm.invoke([{"role": "user", "content": prompt}])
    state["final_response"] = response.content

    # Actualizar costos
    state = update_cost(state, llm_calls=1)

    print(f"   ✓ Respuesta generada ({len(state['final_response'])} caracteres)")

    return state


def save_context_node(state: AgentState) -> AgentState:
    """Save conversation to Supabase after generating response"""
    from conversation import ConversationManager

    conv_manager = ConversationManager()

    # Create conversation if this is first message
    if not state["conversation_id"] and state["user_id"]:
        print("💾 Creating new conversation...")
        title = state["user_query"][:100]
        state["conversation_id"] = conv_manager.create_conversation(
            user_id=state["user_id"],
            title=title
        )
        print(f"   Created: {state['conversation_id']}")

    # Save messages only if we have a conversation_id
    if state["conversation_id"]:
        print("💾 Saving messages to Supabase...")
        # Save user message
        conv_manager.save_message(
            conversation_id=state["conversation_id"],
            role="user",
            content=state["user_query"]
        )

        # Save assistant message with sources
        conv_manager.save_message(
            conversation_id=state["conversation_id"],
            role="assistant",
            content=state["final_response"],
            sources=state["current_results"][:5]  # Top 5 sources
        )

        # Update conversation timestamp
        conv_manager.update_conversation_timestamp(state["conversation_id"])
        print("   ✓ Saved")
    else:
        print("⚠️  No conversation_id or user_id, skipping save")

    return state


# ============================================================================
# Routing Logic
# ============================================================================

def should_continue(state: AgentState) -> Literal["search", "generate_response"]:
    """Decidir si continuar iterando o generar respuesta final"""

    # Caso 1: LLM está satisfecho
    if state["satisfecho"]:
        state["exit_reason"] = "llm_satisfecho"
        print(f"\n✓ Agente satisfecho después de {state['iteration']} iteraciones")
        return "generate_response"

    # Caso 2: Alcanzó máximo de iteraciones
    if state["iteration"] >= state["max_iterations"]:
        state["exit_reason"] = "max_iteraciones"
        print(f"\n⚠ Máximo de iteraciones ({state['max_iterations']}) alcanzado")
        return "generate_response"

    # Caso 3: Consulta redundante
    if state["siguiente_consulta"] and \
       state["siguiente_consulta"].lower() in [q.lower() for q in state["query_history"]]:
        state["exit_reason"] = "consulta_redundante"
        print(f"\n⚠ Consulta redundante detectada, deteniendo")
        return "generate_response"

    # Caso 4: Sin siguiente consulta válida
    if not state["siguiente_consulta"]:
        state["exit_reason"] = "sin_siguiente_consulta"
        print(f"\n⚠ LLM no proporcionó siguiente consulta válida")
        return "generate_response"

    # Caso 5: Presupuesto excedido ($0.50)
    if state["total_cost"] > 0.50:
        state["exit_reason"] = "presupuesto_excedido"
        print(f"\n⚠ Presupuesto excedido (${state['total_cost']:.4f})")
        return "generate_response"

    # Continuar buscando
    print(f"\n🔄 Continuando a iteración {state['iteration'] + 1}...")
    return "search"


# ============================================================================
# Build Graph
# ============================================================================

def create_agent_graph():
    """Crear el grafo de LangGraph"""

    workflow = StateGraph(AgentState)

    # Agregar nodos
    workflow.add_node("load_context", load_context_node)
    workflow.add_node("rewrite_query", rewrite_query_node)    # NEW
    workflow.add_node("search", search_node)
    workflow.add_node("evaluate", evaluate_node)
    workflow.add_node("prepare_next", prepare_next_iteration)
    workflow.add_node("generate_response", generate_response_node)
    workflow.add_node("save_context", save_context_node)

    # Definir flujo
    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "rewrite_query")        # NEW
    workflow.add_edge("rewrite_query", "search")              # CHANGED
    workflow.add_edge("search", "evaluate")
    workflow.add_conditional_edges(
        "evaluate",
        should_continue,
        {
            "search": "prepare_next",
            "generate_response": "generate_response"
        }
    )
    workflow.add_edge("prepare_next", "search")
    workflow.add_edge("generate_response", "save_context")
    workflow.add_edge("save_context", END)

    return workflow.compile()


# ============================================================================
# Main Agent Interface
# ============================================================================

def run_agent(
    user_query: str,
    max_iterations: int = 5,
    conversation_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> dict:
    """
    Run agentic RAG with conversation memory support

    Args:
        user_query: User's question
        max_iterations: Max search iterations (default: 5)
        conversation_id: Resume existing conversation (None = new)
        user_id: Supabase user ID for RLS

    Returns:
        dict with query, results, response, conversation_id, metadata
    """
    print(f"\n{'#'*70}")
    print(f"🤖 AGENTE DE BÚSQUEDA LEGAL RAG")
    print(f"{'#'*70}")
    print(f"Consulta: {user_query}")
    print(f"Máximo de iteraciones: {max_iterations}")
    if conversation_id:
        print(f"Conversation ID: {conversation_id}")

    # Estado inicial
    initial_state: AgentState = {
        "user_query": user_query,
        "iteration": 1,
        "max_iterations": max_iterations,
        "query_history": [],
        "current_query": user_query,
        "current_results": [],
        "all_results_history": [],
        "satisfecho": False,
        "decision": "",
        "razonamiento": "",
        "siguiente_consulta": "",
        "confianza": 0.0,
        "total_cost": 0.0,
        "embedding_calls": 0,
        "llm_calls": 0,
        "exit_reason": "",
        "final_response": "",

        # NEW: Conversation fields
        "conversation_id": conversation_id,
        "user_id": user_id,
        "conversation_history": [],
        "discussed_tesis": set(),
        "historical_sources": [],
        "should_reuse_sources": False
    }

    # Crear y ejecutar grafo
    graph = create_agent_graph()
    final_state = graph.invoke(initial_state)

    # Resultado final
    print(f"\n{'='*70}")
    print(f"📊 RESUMEN FINAL")
    print(f"{'='*70}")
    print(f"Razón de salida: {final_state['exit_reason']}")
    print(f"Iteraciones: {final_state['iteration']}")
    print(f"Costo total: ${final_state['total_cost']:.4f}")
    print(f"Llamadas a embeddings: {final_state['embedding_calls']}")
    print(f"Llamadas a LLM: {final_state['llm_calls']}")
    print(f"Resultados finales: {len(final_state['current_results'])}")
    if final_state.get('conversation_id'):
        print(f"Conversation ID: {final_state['conversation_id']}")

    print(f"\n{'='*70}")
    print(f"💬 RESPUESTA FINAL")
    print(f"{'='*70}")
    print(final_state['final_response'])
    print(f"{'='*70}")

    return {
        "query": user_query,
        "conversation_id": final_state["conversation_id"],  # NEW
        "results": final_state["current_results"],
        "final_response": final_state["final_response"],
        "sources_used": [r.id_tesis for r in final_state["current_results"][:5]],  # NEW
        "metadata": {  # NEW
            "reused_sources": final_state["should_reuse_sources"],
            "discussed_tesis_count": len(final_state["discussed_tesis"]),
            "total_messages": len(final_state["conversation_history"])
        },
        "iterations": final_state["iteration"],
        "exit_reason": final_state["exit_reason"],
        "llm_reasoning": final_state["razonamiento"],
        "total_cost": final_state["total_cost"],
        "embedding_calls": final_state["embedding_calls"],
        "llm_calls": final_state["llm_calls"]
    }


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    """Test the agent"""

    # Test queries
    test_queries = [
        "¿Procede el amparo contra actos de autoridad municipal?",
        "Jurisprudencia sobre derechos humanos y debido proceso",
        "¿Qué criterios existen sobre la suspensión definitiva en amparo?"
    ]

    print("\n" + "="*70)
    print("PRUEBA DEL AGENTE RAG")
    print("="*70)

    for i, query in enumerate(test_queries[:1], 1):  # Start with just 1 query
        print(f"\n\n{'#'*70}")
        print(f"CONSULTA DE PRUEBA {i}")
        print(f"{'#'*70}\n")

        result = run_agent(query, max_iterations=3)

        print(f"\n📋 Resultados principales:")
        for j, r in enumerate(result["results"][:5], 1):
            print(f"\n{j}. [{r.tipo_tesis}] [{r.epoca}]")
            print(f"   {r.rubro}")
            print(f"   Puntuación: {r.rank_score:.2f}, Similitud: {(1-r.distance):.1%}")

        print(f"\n" + "-"*70)
