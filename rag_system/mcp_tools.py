"""
MCP Tools for Legal RAG System
These tools will be used by the LangGraph agent to search and retrieve tesis.
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from dotenv import load_dotenv
from openai import OpenAI
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv("/home/rodrigo/code/monitor_judicial/.env.local")

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@dataclass
class TesisResult:
    """Represents a tesis search result"""
    id_tesis: int
    rubro: str
    texto: str
    epoca: str
    tipo_tesis: str
    instancia: Optional[str]
    anio: Optional[int]
    tesis: Optional[str]
    localizacion: Optional[str]
    distance: Optional[float] = None  # For vector search
    rank_score: Optional[float] = None  # For reranking


def get_local_postgres_conn():
    """Get connection to local Postgres database"""
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="legal_rag",
        user="rodrigo",
        password=os.getenv("LOCAL_POSTGRES_PASSWORD"),
        cursor_factory=RealDictCursor
    )


# ============================================================================
# TOOL 1: Semantic Vector Search
# ============================================================================

def search_tesis_semantic(
    query: str,
    search_field: str = "both",  # "rubro", "texto", or "both"
    limit: int = 20,
    epoca_filter: Optional[str] = None,
    tipo_filter: Optional[str] = None
) -> List[TesisResult]:
    """
    Perform semantic vector similarity search on tesis.

    Args:
        query: The search query in natural language
        search_field: Which embeddings to search ("rubro", "texto", or "both")
        limit: Maximum number of results to return
        epoca_filter: Optional filter by época (e.g., "Undécima Época")
        tipo_filter: Optional filter by tipo_tesis (e.g., "Jurisprudencia")

    Returns:
        List of TesisResult objects sorted by similarity
    """
    # Generate query embedding
    query_embedding = openai_client.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    ).data[0].embedding

    conn = get_local_postgres_conn()
    cursor = conn.cursor()

    # Build the SQL query based on search_field
    if search_field == "rubro":
        distance_calc = "rubro_embedding <=> %s::vector"
        order_by = "rubro_embedding <=> %s::vector"
        params = [query_embedding, query_embedding]
    elif search_field == "texto":
        distance_calc = "texto_embedding <=> %s::vector"
        order_by = "texto_embedding <=> %s::vector"
        params = [query_embedding, query_embedding]
    else:  # both - use minimum distance
        distance_calc = "LEAST(rubro_embedding <=> %s::vector, texto_embedding <=> %s::vector)"
        order_by = distance_calc
        params = [query_embedding, query_embedding, query_embedding, query_embedding]

    # Build WHERE clause
    where_clauses = []
    if epoca_filter:
        where_clauses.append(f"epoca = %s")
        params.append(epoca_filter)
    if tipo_filter:
        where_clauses.append(f"tipo_tesis = %s")
        params.append(tipo_filter)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Add limit
    params.append(limit)

    sql = f"""
        SELECT
            id_tesis, rubro, texto, epoca, tipo_tesis,
            instancia, anio, tesis, localizacion,
            {distance_calc} AS distance
        FROM tesis_embeddings
        {where_sql}
        ORDER BY {order_by}
        LIMIT %s
    """

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convert to TesisResult objects
    results = [
        TesisResult(
            id_tesis=row['id_tesis'],
            rubro=row['rubro'],
            texto=row['texto'],
            epoca=row['epoca'],
            tipo_tesis=row['tipo_tesis'],
            instancia=row['instancia'],
            anio=row['anio'],
            tesis=row['tesis'],
            localizacion=row['localizacion'],
            distance=float(row['distance'])
        )
        for row in rows
    ]

    return results


# ============================================================================
# TOOL 2: Metadata Filtering Search
# ============================================================================

def search_tesis_metadata(
    epoca: Optional[str] = None,
    tipo_tesis: Optional[str] = None,
    instancia: Optional[str] = None,
    anio_min: Optional[int] = None,
    anio_max: Optional[int] = None,
    materias: Optional[List[str]] = None,
    limit: int = 50
) -> List[TesisResult]:
    """
    Search tesis using metadata filters (no vector search).

    Args:
        epoca: Filter by época (e.g., "Undécima Época")
        tipo_tesis: Filter by tipo ("Jurisprudencia" or "Aislada")
        instancia: Filter by instancia (e.g., "SCJN")
        anio_min: Minimum year (inclusive)
        anio_max: Maximum year (inclusive)
        materias: List of materias to filter by (OR logic)
        limit: Maximum number of results

    Returns:
        List of TesisResult objects
    """
    conn = get_local_postgres_conn()
    cursor = conn.cursor()

    where_clauses = []
    params = []

    if epoca:
        where_clauses.append("epoca = %s")
        params.append(epoca)

    if tipo_tesis:
        where_clauses.append("tipo_tesis = %s")
        params.append(tipo_tesis)

    if instancia:
        where_clauses.append("instancia = %s")
        params.append(instancia)

    if anio_min:
        where_clauses.append("anio >= %s")
        params.append(anio_min)

    if anio_max:
        where_clauses.append("anio <= %s")
        params.append(anio_max)

    if materias:
        # Check if any of the provided materias overlap with the array
        where_clauses.append("materias && %s")
        params.append(materias)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    params.append(limit)

    sql = f"""
        SELECT
            id_tesis, rubro, texto, epoca, tipo_tesis,
            instancia, anio, tesis, localizacion
        FROM tesis_embeddings
        {where_sql}
        ORDER BY anio DESC NULLS LAST, id_tesis DESC
        LIMIT %s
    """

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    results = [
        TesisResult(
            id_tesis=row['id_tesis'],
            rubro=row['rubro'],
            texto=row['texto'],
            epoca=row['epoca'],
            tipo_tesis=row['tipo_tesis'],
            instancia=row['instancia'],
            anio=row['anio'],
            tesis=row['tesis'],
            localizacion=row['localizacion']
        )
        for row in rows
    ]

    return results


# ============================================================================
# TOOL 3: Rerank Results by Legal Hierarchy
# ============================================================================

def rerank_tesis(results: List[TesisResult]) -> List[TesisResult]:
    """
    Rerank search results according to legal hierarchy rules:
    1. 11th Época > 10th Época (newer law supersedes)
    2. Jurisprudencia > Aislada (mandatory vs persuasive)
    3. SCJN > Plenos Regionales > Tribunales Colegiados
    4. More recent year > older year

    Args:
        results: List of TesisResult objects to rerank

    Returns:
        Reranked list of TesisResult objects with rank_score set
    """
    def calculate_rank_score(tesis: TesisResult) -> float:
        """Calculate ranking score (higher is better)"""
        score = 0.0

        # Época weight (most important)
        if tesis.epoca == "Undécima Época":
            score += 1000
        elif tesis.epoca == "Décima Época":
            score += 900
        else:
            score += 800  # Older épocas

        # Tipo weight
        if tesis.tipo_tesis == "Jurisprudencia":
            score += 100
        else:  # Aislada
            score += 50

        # Instancia weight
        if tesis.instancia:
            instancia_lower = tesis.instancia.lower()
            if "suprema corte" in instancia_lower or "scjn" in instancia_lower:
                score += 30
            elif "pleno" in instancia_lower:
                score += 20
            elif "tribunal" in instancia_lower and "colegiado" in instancia_lower:
                score += 10

        # Year weight (normalize to 0-10 range, assuming years 2000-2025)
        if tesis.anio:
            year_score = ((tesis.anio - 2000) / 25) * 10
            score += max(0, min(10, year_score))

        # Preserve original similarity if it exists (important!)
        if tesis.distance is not None:
            # Convert distance to similarity (lower distance = higher similarity)
            # Invert and scale: distance of 0.0 = +50, distance of 1.0 = 0
            similarity_bonus = max(0, 50 * (1 - tesis.distance))
            score += similarity_bonus

        return score

    # Calculate rank scores
    for tesis in results:
        tesis.rank_score = calculate_rank_score(tesis)

    # Sort by rank score (descending)
    reranked = sorted(results, key=lambda t: t.rank_score, reverse=True)

    return reranked


# ============================================================================
# TOOL 4: Get Full Tesis Details
# ============================================================================

def get_tesis_full(id_tesis: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve complete tesis information including precedentes.

    Args:
        id_tesis: The ID of the tesis to retrieve

    Returns:
        Dictionary with all tesis fields, or None if not found
    """
    conn = get_local_postgres_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id_tesis, rubro, texto, precedentes,
            epoca, tipo_tesis, instancia, organo_juris, anio, materias,
            tesis, localizacion, fuente,
            created_at, updated_at
        FROM tesis_embeddings
        WHERE id_tesis = %s
    """, (id_tesis,))

    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        return dict(row)
    return None


# ============================================================================
# HELPER: Combined Search + Rerank
# ============================================================================

def search_and_rerank(
    query: str,
    limit: int = 10,
    search_field: str = "both",
    epoca_filter: Optional[str] = None,
    tipo_filter: Optional[str] = None
) -> List[TesisResult]:
    """
    Convenience function: Search semantically, then rerank by legal hierarchy.

    Args:
        query: Search query
        limit: Number of final results to return
        search_field: Which embeddings to search
        epoca_filter: Optional época filter
        tipo_filter: Optional tipo filter

    Returns:
        Reranked list of TesisResult objects
    """
    # Search with higher limit to get more candidates
    search_limit = limit * 3
    results = search_tesis_semantic(
        query=query,
        search_field=search_field,
        limit=search_limit,
        epoca_filter=epoca_filter,
        tipo_filter=tipo_filter
    )

    # Rerank by legal hierarchy
    reranked = rerank_tesis(results)

    # Return top N
    return reranked[:limit]


# ============================================================================
# TEST FUNCTIONS
# ============================================================================

if __name__ == "__main__":
    """Test the MCP tools"""

    print("=" * 80)
    print("TESTING MCP TOOLS")
    print("=" * 80)

    # Test 1: Semantic search
    print("\n1. Testing semantic search...")
    query = "amparo contra actos de autoridad"
    results = search_tesis_semantic(query, limit=5)
    print(f"   Found {len(results)} results for '{query}'")
    for i, r in enumerate(results[:3], 1):
        print(f"   {i}. [{r.tipo_tesis}] {r.rubro[:80]}... (distance: {r.distance:.4f})")

    # Test 2: Metadata filtering
    print("\n2. Testing metadata filtering...")
    results = search_tesis_metadata(
        epoca="Undécima Época",
        tipo_tesis="Jurisprudencia",
        anio_min=2023,
        limit=5
    )
    print(f"   Found {len(results)} Jurisprudencia from 11th Época (2023+)")
    for i, r in enumerate(results[:3], 1):
        print(f"   {i}. [{r.anio}] {r.rubro[:80]}...")

    # Test 3: Reranking
    print("\n3. Testing reranking...")
    search_results = search_tesis_semantic("derechos humanos", limit=10)
    reranked_results = rerank_tesis(search_results)
    print(f"   Reranked {len(reranked_results)} results")
    print("   Top 3 after reranking:")
    for i, r in enumerate(reranked_results[:3], 1):
        print(f"   {i}. [{r.epoca}] [{r.tipo_tesis}] Score: {r.rank_score:.2f}")
        print(f"      {r.rubro[:80]}...")

    # Test 4: Get full tesis
    print("\n4. Testing get_tesis_full...")
    if reranked_results:
        tesis_id = reranked_results[0].id_tesis
        full_tesis = get_tesis_full(tesis_id)
        if full_tesis:
            print(f"   Retrieved full tesis {tesis_id}")
            print(f"   Has precedentes: {full_tesis['precedentes'] is not None}")
            print(f"   Text length: {len(full_tesis['texto'])} chars")

    # Test 5: Combined search + rerank
    print("\n5. Testing search_and_rerank...")
    results = search_and_rerank("amparo indirecto", limit=5)
    print(f"   Found and reranked {len(results)} results")
    for i, r in enumerate(results, 1):
        print(f"   {i}. [{r.tipo_tesis}] Rank: {r.rank_score:.2f}, Dist: {r.distance:.4f}")
        print(f"      {r.rubro[:80]}...")

    print("\n" + "=" * 80)
    print("✓ All tools tested successfully!")
    print("=" * 80)
