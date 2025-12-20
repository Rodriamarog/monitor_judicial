/**
 * Cost Tracker for Monitor Judicial RAG System
 * Rastrea costos de OpenAI en tiempo real
 */

// Precios actualizados (Enero 2025)
const PRICING = {
  embedding: {
    'text-embedding-3-small': 0.02 / 1_000_000, // por token
  },
  llm: {
    'gpt-4o-mini': {
      input: 0.15 / 1_000_000,  // por token input
      output: 0.60 / 1_000_000, // por token output
    },
  },
} as const

interface UsageMetrics {
  embeddingTokens: number
  inputTokens: number
  outputTokens: number
  numTesis: number
}

interface CostBreakdown {
  embeddingCost: number
  inputCost: number
  outputCost: number
  totalCost: number
  metrics: UsageMetrics
}

/**
 * Calcula el costo de una operación RAG
 */
export function calculateCost(metrics: UsageMetrics): CostBreakdown {
  const embeddingCost = metrics.embeddingTokens * PRICING.embedding['text-embedding-3-small']
  const inputCost = metrics.inputTokens * PRICING.llm['gpt-4o-mini'].input
  const outputCost = metrics.outputTokens * PRICING.llm['gpt-4o-mini'].output

  return {
    embeddingCost,
    inputCost,
    outputCost,
    totalCost: embeddingCost + inputCost + outputCost,
    metrics,
  }
}

/**
 * Estima tokens de una string (aproximación: 1 token ≈ 4 caracteres en español)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Logger de costos para consola
 */
export function logCost(cost: CostBreakdown, context?: string): void {
  const prefix = context ? `[Cost:${context}]` : '[Cost]'

  console.log(
    `${prefix} ` +
    `Tokens: ${cost.metrics.inputTokens + cost.metrics.outputTokens} ` +
    `(${cost.metrics.numTesis} tesis) | ` +
    `Cost: $${cost.totalCost.toFixed(6)} ` +
    `(E:$${cost.embeddingCost.toFixed(6)} + ` +
    `I:$${cost.inputCost.toFixed(6)} + ` +
    `O:$${cost.outputCost.toFixed(6)})`
  )
}

/**
 * Middleware para rastrear costos en cada request
 *
 * Uso en route.ts:
 *
 * const tracker = createCostTracker()
 *
 * // Después de embedding
 * tracker.recordEmbedding(queryEmbedding.usage.total_tokens)
 *
 * // Después de LLM
 * tracker.recordLLM(result.usage.promptTokens, result.usage.completionTokens, sources.length)
 *
 * // Al final
 * const cost = tracker.getCost()
 * logCost(cost, 'RAG Query')
 */
export function createCostTracker() {
  let embeddingTokens = 0
  let inputTokens = 0
  let outputTokens = 0
  let numTesis = 0

  return {
    recordEmbedding(tokens: number) {
      embeddingTokens += tokens
    },

    recordLLM(input: number, output: number, tesis: number) {
      inputTokens += input
      outputTokens += output
      numTesis = tesis
    },

    getCost(): CostBreakdown {
      return calculateCost({
        embeddingTokens,
        inputTokens,
        outputTokens,
        numTesis,
      })
    },

    reset() {
      embeddingTokens = 0
      inputTokens = 0
      outputTokens = 0
      numTesis = 0
    },
  }
}

/**
 * Proyección de costos mensuales
 */
export function projectMonthlyCost(
  avgCostPerQuery: number,
  queriesPerDay: number
): {
  daily: number
  weekly: number
  monthly: number
  queriesPerMonth: number
} {
  const daily = avgCostPerQuery * queriesPerDay
  const weekly = daily * 7
  const monthly = daily * 30
  const queriesPerMonth = queriesPerDay * 30

  return { daily, weekly, monthly, queriesPerMonth }
}

/**
 * Compara costo de diferentes configuraciones
 */
export function compareTesisConfigs(avgTokensPerTesis: number = 450) {
  const configs = [3, 5, 10, 15]
  const basePromptTokens = 350
  const queryTokens = 30
  const outputTokens = 400

  return configs.map((numTesis) => {
    const contextTokens = numTesis * avgTokensPerTesis
    const inputTokens = basePromptTokens + queryTokens + contextTokens

    const cost = calculateCost({
      embeddingTokens: queryTokens,
      inputTokens,
      outputTokens,
      numTesis,
    })

    return {
      numTesis,
      cost: cost.totalCost,
      costFormatted: `$${cost.totalCost.toFixed(6)}`,
    }
  })
}

// Exportar precios para referencia
export { PRICING }
