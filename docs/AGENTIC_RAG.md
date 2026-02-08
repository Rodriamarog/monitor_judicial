# Agentic RAG System Documentation

## Overview

The Agentic RAG system implements an iterative, self-correcting retrieval-augmented generation (RAG) flow that uses LLM evaluation to improve search results across multiple iterations.

## Architecture

### Core Components

1. **AgentStateManager** (`lib/ai/agent-state.ts`)
   - Manages iteration state and query history
   - Tracks costs (embedding calls, LLM calls)
   - Filters discussed tesis from conversation history
   - Monitors budget limits ($0.50 hard cap)

2. **Legal Hierarchy Reranker** (`lib/ai/legal-reranker.ts`)
   - Reranks results based on Mexican legal hierarchy
   - Scoring factors:
     - Época: 11ª Época (1000) > 10ª Época (900) > 9ª Época (800)
     - Tipo: Jurisprudencia (100) > Tesis Aislada (50)
     - Instancia: SCJN (30) > Plenos (20) > Tribunales (15)
     - Year: More recent = higher score (0-10 range)
     - Similarity: Preserves original relevance (0-50 bonus)

3. **Quality Evaluator** (`lib/ai/quality-evaluator.ts`)
   - LLM-driven evaluation of search results
   - Assesses: relevancia, autoridad, cantidad, completitud
   - Returns decision: SATISFECHO, REFINAR, AMPLIAR, FILTRAR
   - Suggests next query if not satisfied

4. **Agent Controller** (`lib/ai/agent-controller.ts`)
   - Orchestrates the main iteration loop
   - Implements 5 exit conditions
   - Tracks all state changes and costs

### Iteration Loop

```
1. Execute search with current query
2. Filter already-discussed tesis
3. Rerank by legal hierarchy
4. Update costs (embedding call)
5. Evaluate with LLM
6. Update costs (LLM call)
7. Check exit conditions
8. If continue: prepare next iteration
9. If exit: return final state
```

### Exit Conditions (5 total)

1. **llm_satisfecho** - LLM determines results are sufficient
2. **max_iteraciones** - Hit maximum iterations (default: 5)
3. **consulta_redundante** - Next query already searched
4. **sin_siguiente_consulta** - LLM didn't provide next query
5. **presupuesto_excedido** - Cost exceeded $0.50 budget

## Usage

### Enable Agentic RAG

Set the feature flag in `.env.local`:

```bash
USE_AGENTIC_RAG=true
```

### Integration

The system is integrated into the chat route at:
`app/api/ai-assistant/chat/route.typescript.ts`

When enabled, it replaces the single-shot RAG search with the agentic loop.

### Response Headers

The API returns additional headers with agent metadata:

```
X-Agent-Iterations: 3           # Number of iterations executed
X-Agent-Exit-Reason: llm_satisfecho  # Why the agent stopped
X-Agent-Cost: 0.0156            # Total cost in USD
```

## Decision Logic

### SATISFECHO (Satisfied)
- **When**: 3+ relevant, authoritative tesis found
- **Action**: Exit loop, generate response
- **Next query**: null

### REFINAR (Refine)
- **When**: Results exist but many are irrelevant
- **Action**: Use more specific keywords
- **Next query**: More targeted version of current query

### AMPLIAR (Expand)
- **When**: Very few results (<3) or too specific
- **Action**: Broaden search with related terms
- **Next query**: More general version with synonyms

### FILTRAR (Filter)
- **When**: Too many irrelevant results (>10 low relevance)
- **Action**: Add filters or be more specific
- **Next query**: Add specific constraints

## Cost Tracking

### Cost Model

Based on OpenAI pricing (2025):
- **Embeddings** (text-embedding-3-small): $0.00002 per 1K tokens
- **LLM** (gpt-4o-mini):
  - Input: $0.00015 per 1K tokens
  - Output: $0.0006 per 1K tokens

### Average Costs

- **Single embedding call**: ~$0.0004 (20 tokens avg)
- **Single LLM evaluation**: ~$0.0045 (1000 input + 500 output tokens)
- **Per iteration**: ~$0.0049
- **Full agent run (3 iterations)**: ~$0.015

### Budget Protection

- Hard limit: $0.50 per query
- Exits with `presupuesto_excedido` if exceeded
- Prevents runaway costs from infinite loops

## Performance Metrics

### Target Metrics

- **Average iterations**: 2-3 (not hitting max 5)
- **Average latency**: <15 seconds
- **Average cost**: $0.01-0.03 per query
- **Budget exceeded rate**: <1%

### Quality Metrics

- **Exit distribution**: 70% satisfied, 20% max_iter, 10% other
- **Source diversity**: 3+ different épocas
- **Recency**: 80% results from 2015+
- **User follow-up rate**: <30%

## Testing

### Unit Tests

Run test suite:
```bash
npm test lib/ai/__tests__/agent.test.ts
```

### Manual Test Scenarios

1. **Single iteration** - Query: "¿Qué es amparo indirecto?"
2. **Multiple iterations** - Query: "amparo" (broad)
3. **Max iterations** - Query: "xyz123" (nonsense)
4. **Redundant query** - LLM suggests same query twice
5. **Discussed filtering** - Repeat conversation with same tesis
6. **Cost limit** - Mock high LLM costs

### Integration Testing

Test with real API in development:

```typescript
// Enable in .env.local
USE_AGENTIC_RAG=true

// Query via UI or API
// Check response headers for agent metadata
// Verify iterations, exit reason, and cost
```

## Migration Strategy

### Phase 1: Shadow Mode (Week 1)
- Enable for 0% of users
- Log agent decisions but serve single-shot results
- Monitor metrics and tune prompts

### Phase 2: Limited Rollout (Week 2)
- Enable for 10% of users
- Monitor error rates and user satisfaction
- Collect performance data

### Phase 3: Gradual Expansion (Week 3)
- Enable for 50% of users
- Compare quality metrics between modes
- Tune exit conditions and prompts

### Phase 4: Full Rollout (Week 4)
- Enable for 100% of users
- Monitor for regression
- Optimize costs and latency

### Phase 5: Cleanup (Week 5)
- Remove feature flag
- Delete old single-shot code path
- Remove Python API dependency

## Debugging

### Enable Debug Logs

All agent operations log to console with `[Agent]` prefix:

```
[Agent] Starting agentic RAG loop
[Agent] User query: "amparo indirecto"
[Agent] === Iteration 1/5 ===
[Agent] Executing search...
[Agent] Raw results: 45
[Agent] After filtering discussed: 42
[Agent] Results reranked by legal hierarchy
[Agent] Evaluation result: { satisfecho: false, decision: 'REFINAR' }
[Agent] Next query: "amparo indirecto procedencia"
```

### Check State

The agent returns full state on completion:

```typescript
const finalState = await agent.runLoop(searchFunction)

console.log({
  iterations: finalState.iteration,
  exitReason: finalState.exitReason,
  totalCost: finalState.totalCost,
  queryHistory: finalState.queryHistory,
  resultsCount: finalState.currentResults.length,
})
```

### Common Issues

**Issue**: Agent exits with `max_iteraciones` frequently
- **Cause**: Evaluation prompt too strict
- **Fix**: Tune evaluation criteria in `quality-evaluator.ts`

**Issue**: Agent exits with `consulta_redundante`
- **Cause**: LLM suggesting similar queries
- **Fix**: Add more variation to query rewriting instructions

**Issue**: High costs (>$0.03 per query)
- **Cause**: Too many iterations
- **Fix**: Make evaluation more conservative (accept earlier)

**Issue**: Low-quality results
- **Cause**: Exiting too early
- **Fix**: Increase confidence threshold in evaluator

## Future Enhancements

### Potential Improvements

1. **Adaptive iteration limits** - Increase max iterations for complex queries
2. **Query expansion strategies** - Use legal thesaurus for synonyms
3. **Result caching** - Cache search results by query hash
4. **Parallel searches** - Run multiple query variations simultaneously
5. **User feedback loop** - Learn from user satisfaction signals
6. **Cost optimization** - Use cheaper models for evaluation
7. **Streaming evaluation** - Stream LLM decisions in real-time

### Research Directions

1. **Fine-tuned evaluator** - Train custom model on legal relevance
2. **Hybrid ranking** - Combine BM25 and semantic search
3. **Query planning** - Plan entire search strategy upfront
4. **Multi-agent collaboration** - Specialized agents for different legal areas

## References

- Original Python implementation: `rag_system/` (deprecated)
- Plan document: Project root (see plan mode transcript)
- Related modules:
  - Intent classifier: `lib/ai/intent-classifier.ts`
  - Query rewriter: `lib/ai/query-rewriter.ts`
  - Source manager: `lib/ai/source-manager.ts`
