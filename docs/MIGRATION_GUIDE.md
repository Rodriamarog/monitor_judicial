# Agentic RAG Migration Guide

## Overview

This guide outlines the process for migrating from single-shot RAG to the new agentic RAG system.

## Migration Phases

### Phase 1: Testing & Validation (Week 1)

**Goal**: Verify system works in development

**Steps**:
1. Enable feature flag in `.env.local`:
   ```bash
   USE_AGENTIC_RAG=true
   ```

2. Test with various queries:
   - Simple: "amparo indirecto"
   - Complex: "jurisprudencia fiscal deducción inversiones"
   - Broad: "amparo"
   - Edge cases: nonsense queries, very specific terms

3. Monitor console logs:
   - Check iteration counts
   - Verify exit reasons
   - Track costs

4. Validate results quality:
   - Compare with single-shot results
   - Check legal hierarchy ranking
   - Verify no discussed tesis repeated

**Success Criteria**:
- [ ] All test queries complete successfully
- [ ] Average iterations: 2-3
- [ ] Average cost: <$0.03
- [ ] No TypeScript errors
- [ ] Response headers populated correctly

### Phase 2: Shadow Mode (Week 2)

**Goal**: Collect production data without serving results

**Steps**:
1. Implement shadow mode logic:
   ```typescript
   const SHADOW_MODE = process.env.AGENTIC_RAG_SHADOW === 'true'

   if (USE_AGENTIC_RAG && SHADOW_MODE) {
     // Run agent but don't use results
     const finalState = await agent.runLoop(...)

     // Log for analysis
     console.log('[Shadow Mode]', {
       iterations: finalState.iteration,
       exitReason: finalState.exitReason,
       cost: finalState.totalCost,
     })

     // Still use single-shot results
     sources = singleShotResults
   }
   ```

2. Deploy to production with `AGENTIC_RAG_SHADOW=true`

3. Collect metrics:
   - Iteration distribution
   - Exit reason distribution
   - Cost distribution
   - Latency distribution

4. Compare result quality:
   - Run both systems in parallel
   - Log differences in results
   - Track which produces better results

**Success Criteria**:
- [ ] 1000+ queries processed in shadow mode
- [ ] Exit distribution: ~70% satisfied
- [ ] Average cost: $0.01-0.03
- [ ] No production errors
- [ ] Quality metrics equal or better

### Phase 3: Limited Rollout (Week 3)

**Goal**: Serve agentic RAG to 10% of users

**Steps**:
1. Implement percentage-based rollout:
   ```typescript
   const USE_AGENTIC = process.env.USE_AGENTIC_RAG === 'true'
   const ROLLOUT_PERCENTAGE = parseInt(process.env.AGENTIC_ROLLOUT_PCT || '0')

   const useAgenticForUser = USE_AGENTIC &&
     (Math.random() * 100 < ROLLOUT_PERCENTAGE)
   ```

2. Set `AGENTIC_ROLLOUT_PCT=10`

3. Monitor closely:
   - Error rates
   - User satisfaction (follow-up rates)
   - Latency impact
   - Cost impact

4. Collect user feedback:
   - Survey users in A/B test
   - Track conversation success rates
   - Monitor support tickets

**Success Criteria**:
- [ ] 10% rollout stable for 1 week
- [ ] Error rate <0.1%
- [ ] User satisfaction unchanged or improved
- [ ] Budget impact acceptable (<3x increase)

### Phase 4: Gradual Expansion (Week 4)

**Goal**: Increase to 50% then 100%

**Steps**:
1. Increase rollout percentage:
   - Day 1-2: Set `AGENTIC_ROLLOUT_PCT=25`
   - Day 3-4: Set `AGENTIC_ROLLOUT_PCT=50`
   - Day 5-7: Set `AGENTIC_ROLLOUT_PCT=100`

2. Monitor metrics at each stage:
   - Pause rollout if issues detected
   - Tune parameters based on feedback

3. Compare final metrics:
   - Single-shot vs agentic quality
   - Cost analysis
   - User satisfaction

**Success Criteria**:
- [ ] 100% rollout achieved
- [ ] All metrics stable
- [ ] No significant regressions
- [ ] User feedback positive

### Phase 5: Cleanup (Week 5)

**Goal**: Remove old code and feature flags

**Steps**:
1. Remove feature flag checks:
   ```typescript
   // Remove this conditional
   if (USE_AGENTIC_RAG) {
     // Use agentic
   } else {
     // Use single-shot
   }

   // Keep only agentic path
   const agent = new AgentController(...)
   const finalState = await agent.runLoop(...)
   ```

2. Delete unused code:
   - Remove single-shot RAG path
   - Clean up duplicate logic
   - Update tests

3. Update documentation:
   - Remove migration guides
   - Update main docs to reflect agentic as default
   - Archive old Python system

4. Deprecate Python API:
   - Shut down `rag_system/api_server.py`
   - Archive Python code
   - Update deployment scripts

**Success Criteria**:
- [ ] Feature flag removed
- [ ] Old code deleted
- [ ] Tests updated and passing
- [ ] Documentation current
- [ ] Python API shut down

## Rollback Plan

If issues are detected at any phase:

### Quick Rollback
```bash
# Disable immediately
USE_AGENTIC_RAG=false

# Or reduce percentage
AGENTIC_ROLLOUT_PCT=0
```

### Full Rollback
1. Set `USE_AGENTIC_RAG=false` in production
2. Restart services
3. Monitor for stability
4. Investigate root cause
5. Fix issues in development
6. Restart migration from Phase 1

## Monitoring Dashboard

Key metrics to track:

### Performance
- Average iterations per query
- Average latency (ms)
- P95 latency
- P99 latency

### Cost
- Average cost per query
- Total daily cost
- Cost by exit reason
- Budget exceeded rate

### Quality
- Exit reason distribution
- Results diversity (épocas, tipos)
- Results recency (avg year)
- User follow-up rate

### Reliability
- Error rate
- Timeout rate
- Budget exceeded rate
- Redundant query rate

## Common Issues & Solutions

### Issue: High Iteration Count

**Symptoms**:
- Average iterations >3.5
- Frequently hitting max (5)

**Solutions**:
- Tune evaluation prompt to be less strict
- Lower confidence threshold
- Improve legal reranking weights

### Issue: High Costs

**Symptoms**:
- Average cost >$0.03
- Budget frequently exceeded

**Solutions**:
- Reduce max iterations from 5 to 3
- Use cheaper evaluation model
- Increase budget limit if quality is good

### Issue: Poor Quality

**Symptoms**:
- High user follow-up rate
- Low result diversity
- Complaints about results

**Solutions**:
- Make evaluation stricter
- Improve reranking algorithm
- Add more refinement iterations

### Issue: Slow Performance

**Symptoms**:
- Average latency >15s
- User complaints about speed

**Solutions**:
- Reduce max iterations
- Parallelize search calls
- Cache common queries
- Optimize evaluation prompt

## Success Metrics

### Target Metrics (Production)

| Metric | Target | Current (Baseline) |
|--------|--------|-------------------|
| Avg iterations | 2-3 | 1 (single-shot) |
| Avg latency | <15s | 2-3s |
| Avg cost | $0.01-0.03 | $0.003 |
| Exit satisfied % | >70% | N/A |
| Error rate | <0.1% | <0.1% |
| User follow-up rate | <30% | ~40% |

### Quality Improvements

- **Result diversity**: 3+ different épocas
- **Recency**: 80%+ from 2015+
- **Authority**: 50%+ Jurisprudencia
- **Relevance**: Higher similarity scores

## Timeline Summary

| Week | Phase | Rollout % | Goal |
|------|-------|-----------|------|
| 1 | Testing | 0% | Validate in dev |
| 2 | Shadow Mode | 0% | Collect data |
| 3 | Limited | 10% | Prove stability |
| 4 | Expansion | 25→50→100% | Full rollout |
| 5 | Cleanup | 100% | Remove old code |

## Post-Migration

After successful migration:

1. **Monitor continuously**:
   - Set up alerts for metric regressions
   - Weekly review of quality metrics
   - Monthly cost analysis

2. **Iterate and improve**:
   - Fine-tune evaluation prompts
   - Optimize reranking weights
   - Experiment with new strategies

3. **Document learnings**:
   - Update MEMORY.md with insights
   - Share successful patterns
   - Document edge cases

4. **Plan next enhancements**:
   - Adaptive iteration limits
   - Query expansion strategies
   - Result caching
   - Parallel searches
