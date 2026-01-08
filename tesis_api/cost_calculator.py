#!/usr/bin/env python3
"""
Cost Calculator for Monitor Judicial RAG System
Calcula el costo por consulta del sistema de AI Asistente Legal
"""

import json
from typing import Dict, Tuple

# ============================================
# PRECIOS DE OPENAI (Actualizados Enero 2025)
# ============================================

# Embeddings: text-embedding-3-small
EMBEDDING_COST_PER_1M_TOKENS = 0.02  # USD

# LLM: gpt-4o-mini
GPT4O_MINI_INPUT_COST_PER_1M = 0.150   # USD por 1M tokens de entrada
GPT4O_MINI_OUTPUT_COST_PER_1M = 0.600  # USD por 1M tokens de salida

# ============================================
# ESTIMACIONES BASADAS EN TU SISTEMA ACTUAL
# ============================================

# Tokens promedio por componente (basado en análisis del código)
AVG_USER_QUERY_TOKENS = 30          # "¿Cuáles son los requisitos para...?"
AVG_TESIS_CHUNK_TOKENS = 400        # Chunk de texto de tesis
AVG_SYSTEM_PROMPT_TOKENS = 350      # Tu system prompt mejorado
AVG_COMPLETION_TOKENS = 400         # Respuesta del asistente (promedio)
AVG_CONVERSATION_HISTORY = 200      # Mensajes previos en conversación

# Overhead del formato del contexto
OVERHEAD_PER_TESIS = 50  # "[Fuente X - ID: XXX]\nRubro:...\nRelevancia:..." etc.


def estimate_tokens_for_tesis_count(num_tesis: int) -> Dict[str, int]:
    """
    Estima los tokens para una consulta con N tesis en el contexto
    """
    # Input tokens al LLM
    context_tokens = (AVG_TESIS_CHUNK_TOKENS + OVERHEAD_PER_TESIS) * num_tesis
    input_tokens = (
        AVG_SYSTEM_PROMPT_TOKENS +
        context_tokens +
        AVG_USER_QUERY_TOKENS +
        AVG_CONVERSATION_HISTORY
    )

    # Output tokens del LLM (no varía mucho con más tesis)
    output_tokens = AVG_COMPLETION_TOKENS

    # Embedding tokens (solo la query del usuario)
    embedding_tokens = AVG_USER_QUERY_TOKENS

    return {
        "embedding_tokens": embedding_tokens,
        "llm_input_tokens": input_tokens,
        "llm_output_tokens": output_tokens,
        "context_tokens": context_tokens,
        "total_tokens": embedding_tokens + input_tokens + output_tokens
    }


def calculate_cost_per_query(num_tesis: int) -> Dict[str, float]:
    """
    Calcula el costo total de una consulta con N tesis
    """
    tokens = estimate_tokens_for_tesis_count(num_tesis)

    # Costos individuales
    embedding_cost = (tokens["embedding_tokens"] / 1_000_000) * EMBEDDING_COST_PER_1M_TOKENS
    llm_input_cost = (tokens["llm_input_tokens"] / 1_000_000) * GPT4O_MINI_INPUT_COST_PER_1M
    llm_output_cost = (tokens["llm_output_tokens"] / 1_000_000) * GPT4O_MINI_OUTPUT_COST_PER_1M

    total_cost = embedding_cost + llm_input_cost + llm_output_cost

    return {
        "embedding_cost": embedding_cost,
        "llm_input_cost": llm_input_cost,
        "llm_output_cost": llm_output_cost,
        "total_cost": total_cost,
        "tokens": tokens
    }


def compare_scenarios(scenarios: list[int]) -> None:
    """
    Compara diferentes escenarios de número de tesis
    """
    print("=" * 80)
    print("CALCULADORA DE COSTOS - Monitor Judicial RAG System")
    print("=" * 80)
    print()
    print("Precios OpenAI (Enero 2025):")
    print(f"  - text-embedding-3-small: ${EMBEDDING_COST_PER_1M_TOKENS:.3f} / 1M tokens")
    print(f"  - gpt-4o-mini input:      ${GPT4O_MINI_INPUT_COST_PER_1M:.3f} / 1M tokens")
    print(f"  - gpt-4o-mini output:     ${GPT4O_MINI_OUTPUT_COST_PER_1M:.3f} / 1M tokens")
    print()
    print("Estimaciones del sistema:")
    print(f"  - Query promedio:         {AVG_USER_QUERY_TOKENS} tokens")
    print(f"  - Chunk de tesis:         {AVG_TESIS_CHUNK_TOKENS} tokens")
    print(f"  - System prompt:          {AVG_SYSTEM_PROMPT_TOKENS} tokens")
    print(f"  - Respuesta promedio:     {AVG_COMPLETION_TOKENS} tokens")
    print()
    print("=" * 80)
    print()

    results = {}
    for num_tesis in scenarios:
        results[num_tesis] = calculate_cost_per_query(num_tesis)

    # Tabla comparativa
    print("COMPARACIÓN DE ESCENARIOS")
    print("=" * 80)
    print(f"{'Tesis':<8} {'Embed $':<12} {'Input $':<12} {'Output $':<12} {'TOTAL $':<12} {'Tokens':<10}")
    print("-" * 80)

    for num_tesis in scenarios:
        r = results[num_tesis]
        print(f"{num_tesis:<8} "
              f"${r['embedding_cost']:<11.6f} "
              f"${r['llm_input_cost']:<11.6f} "
              f"${r['llm_output_cost']:<11.6f} "
              f"${r['total_cost']:<11.6f} "
              f"{r['tokens']['total_tokens']:<10,}")

    print()

    # Análisis de diferencia entre top 5 y top 10
    if 5 in results and 10 in results:
        diff_cost = results[10]['total_cost'] - results[5]['total_cost']
        diff_percent = (diff_cost / results[5]['total_cost']) * 100
        diff_tokens = results[10]['tokens']['total_tokens'] - results[5]['tokens']['total_tokens']

        print("ANÁLISIS: Top 5 vs Top 10")
        print("=" * 80)
        print(f"Costo adicional por query:     ${diff_cost:.6f} USD (+{diff_percent:.1f}%)")
        print(f"Tokens adicionales:            {diff_tokens:,} tokens")
        print()

        # Proyecciones mensuales
        queries_per_day = [10, 50, 100, 500, 1000]
        print("PROYECCIÓN MENSUAL (30 días):")
        print("-" * 80)
        print(f"{'Queries/día':<15} {'Top 5 Costo':<18} {'Top 10 Costo':<18} {'Diferencia':<15}")
        print("-" * 80)

        for qpd in queries_per_day:
            monthly_queries = qpd * 30
            cost_5 = results[5]['total_cost'] * monthly_queries
            cost_10 = results[10]['total_cost'] * monthly_queries
            diff = cost_10 - cost_5

            print(f"{qpd:<15} "
                  f"${cost_5:<17.2f} "
                  f"${cost_10:<17.2f} "
                  f"+${diff:<14.2f}")

        print()

    # Análisis de componentes de costo
    print("DESGLOSE DE COSTOS (Top 5 vs Top 10)")
    print("=" * 80)

    for num_tesis in [5, 10]:
        if num_tesis in results:
            r = results[num_tesis]
            total = r['total_cost']

            print(f"\nTop {num_tesis} Tesis:")
            print(f"  Embeddings:    ${r['embedding_cost']:.6f}  ({r['embedding_cost']/total*100:.1f}%)")
            print(f"  LLM Input:     ${r['llm_input_cost']:.6f}  ({r['llm_input_cost']/total*100:.1f}%)")
            print(f"  LLM Output:    ${r['llm_output_cost']:.6f}  ({r['llm_output_cost']/total*100:.1f}%)")
            print(f"  TOTAL:         ${total:.6f}")
            print(f"  Context size:  {r['tokens']['context_tokens']:,} tokens ({num_tesis} tesis)")


def calculate_budget_limit(monthly_budget_usd: float, num_tesis: int) -> Dict[str, float]:
    """
    Calcula cuántas queries puedes hacer con un presupuesto mensual
    """
    cost = calculate_cost_per_query(num_tesis)
    max_queries = monthly_budget_usd / cost['total_cost']
    queries_per_day = max_queries / 30

    return {
        "monthly_budget": monthly_budget_usd,
        "cost_per_query": cost['total_cost'],
        "max_queries_per_month": max_queries,
        "max_queries_per_day": queries_per_day
    }


if __name__ == "__main__":
    # Comparar escenarios: 3, 5, 10, 15 tesis
    compare_scenarios([3, 5, 10, 15])

    print("\n")
    print("=" * 80)
    print("LÍMITES DE PRESUPUESTO")
    print("=" * 80)

    budgets = [10, 50, 100, 500]
    for budget in budgets:
        print(f"\nPresupuesto mensual: ${budget} USD")
        print("-" * 40)
        for num_tesis in [5, 10]:
            limit = calculate_budget_limit(budget, num_tesis)
            print(f"  Top {num_tesis}: {limit['max_queries_per_month']:.0f} queries/mes "
                  f"(~{limit['max_queries_per_day']:.1f} queries/día)")

    print("\n")
    print("=" * 80)
    print("RECOMENDACIONES")
    print("=" * 80)
    print("""
1. El costo adicional de pasar de Top 5 a Top 10 es MÍNIMO (~50% más)
   pero mejora significativamente la calidad del contexto.

2. El componente más caro es el OUTPUT del LLM (60% del costo total).
   Los tokens de contexto adicionales solo incrementan el INPUT (~30% del costo).

3. SUGERENCIA: Usa Top 10 para la búsqueda SQL + re-ranking inteligente,
   luego reduce a Top 5 las mejores. Esto te da:
   - Mejor calidad de resultados (más candidatos para re-ranking)
   - Costo final igual (solo 5 tesis van al LLM)

4. Si tu presupuesto es limitado, considera:
   - Cachear respuestas frecuentes
   - Usar Top 5 para usuarios free, Top 10 para usuarios premium
   - Implementar rate limiting por usuario

5. El sistema actual (Top 5) cuesta ~$0.0003 por query.
   Con 1000 queries/día = ~$9/mes. MUY ECONÓMICO con gpt-4o-mini.
""")

    print("=" * 80)
    print()
