# Agentic RAG Quick Start Guide

## What is Agentic RAG?

An intelligent search system that iteratively refines legal research queries until it finds the best results, using LLM evaluation to decide when to continue searching or when results are good enough.

## Quick Enable

1. Open `.env.local`
2. Set `USE_AGENTIC_RAG=true`
3. Restart your dev server

That's it! The system will now use agentic RAG for all new queries.

## How It Works (Simple)

```
User asks: "amparo indirecto"
  ↓
Iteration 1: Search for "amparo indirecto"
  → Found 45 results
  → LLM evaluates: "Good, but could be more specific"
  → Decision: REFINAR
  ↓
Iteration 2: Search for "amparo indirecto procedencia"
  → Found 12 highly relevant results
  → LLM evaluates: "Perfect! We have enough"
  → Decision: SATISFECHO
  ↓
Generate response with best 12 results
```

## Key Differences from Old System

| Feature | Single-Shot (Old) | Agentic (New) |
|---------|------------------|---------------|
| Iterations | 1 (always) | 1-5 (adaptive) |
| Quality check | None | LLM evaluation |
| Cost | $0.003/query | $0.01-0.03/query |
| Latency | 2-3s | 5-15s |
| Result quality | Good | Excellent |

## Monitoring

Check response headers in browser DevTools:

```
X-Agent-Iterations: 3
X-Agent-Exit-Reason: llm_satisfecho
X-Agent-Cost: 0.0156
```

## Console Logs

Watch for `[Agent]` logs:

```
[Agent] Starting agentic RAG loop
[Agent] === Iteration 1/5 ===
[Agent] Evaluation result: { satisfecho: false, decision: 'REFINAR' }
[Agent] === Iteration 2/5 ===
[Agent] Evaluation result: { satisfecho: true, decision: 'SATISFECHO' }
[Agent] Exiting loop: llm_satisfecho
[Agent] Final Summary: 2 iterations, $0.0098
```

## Testing Scenarios

### Good Query (1-2 iterations)
```
Query: "¿Qué es el amparo indirecto?"
Expected: Satisfied quickly with clear results
```

### Broad Query (2-3 iterations)
```
Query: "amparo"
Expected: Refines to more specific search
```

### Complex Query (3-4 iterations)
```
Query: "jurisprudencia fiscal deducción inversiones"
Expected: Multiple refinements to find best results
```

## Troubleshooting

### Too Many Iterations
**Symptom**: Always hitting 5 iterations
**Fix**: Evaluation prompt may be too strict. Check `lib/ai/quality-evaluator.ts`

### Too Expensive
**Symptom**: Costs >$0.03 per query
**Fix**: Reduce max iterations or tune early exit conditions

### Low Quality
**Symptom**: Results worse than single-shot
**Fix**: Legal reranking may need tuning. Check `lib/ai/legal-reranker.ts`

## Disable Agentic RAG

Set `USE_AGENTIC_RAG=false` in `.env.local` and restart.

The system will fall back to the original single-shot RAG.

## Next Steps

- Read full documentation: `docs/AGENTIC_RAG.md`
- Run tests: `npm test lib/ai/__tests__/agent.test.ts`
- Monitor production metrics
- Tune evaluation prompts based on user feedback
