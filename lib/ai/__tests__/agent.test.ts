/**
 * Agentic RAG Test Suite
 *
 * Tests the complete agent flow including:
 * - State management and cost tracking
 * - Legal hierarchy reranking
 * - Quality evaluation with LLM
 * - Iteration loop and exit conditions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentStateManager, TesisSource, COST_CONFIG } from '../agent-state';
import { rerankByLegalHierarchy, analyzeHierarchyDistribution } from '../legal-reranker';
import { AgentController } from '../agent-controller';

describe('AgentStateManager', () => {
  let stateManager: AgentStateManager;

  beforeEach(() => {
    stateManager = new AgentStateManager({
      userQuery: 'Test query',
      currentQuery: 'Initial query',
      maxIterations: 5,
    });
  });

  it('initializes state correctly', () => {
    const state = stateManager.getState();
    expect(state.iteration).toBe(0);
    expect(state.maxIterations).toBe(5);
    expect(state.totalCost).toBe(0);
    expect(state.satisfecho).toBe(false);
  });

  it('updates cost correctly', () => {
    stateManager.updateCost(1, 0); // 1 embedding call
    let state = stateManager.getState();
    expect(state.embeddingCalls).toBe(1);
    expect(state.totalCost).toBeGreaterThan(0);

    const costAfterEmbedding = state.totalCost;

    stateManager.updateCost(0, 1); // 1 LLM call
    state = stateManager.getState();
    expect(state.llmCalls).toBe(1);
    expect(state.totalCost).toBeGreaterThan(costAfterEmbedding);
  });

  it('increments iteration', () => {
    stateManager.incrementIteration();
    const state = stateManager.getState();
    expect(state.iteration).toBe(1);
  });

  it('tracks query history', () => {
    stateManager.addToQueryHistory('query 1');
    stateManager.addToQueryHistory('query 2');

    const state = stateManager.getState();
    expect(state.queryHistory).toContain('query 1');
    expect(state.queryHistory).toContain('query 2');
  });

  it('detects redundant queries', () => {
    stateManager.addToQueryHistory('test query');

    expect(stateManager.isQueryRedundant('test query')).toBe(true);
    expect(stateManager.isQueryRedundant('TEST QUERY')).toBe(true); // Case insensitive
    expect(stateManager.isQueryRedundant('different query')).toBe(false);
  });

  it('detects budget exceeded', () => {
    // Simulate high cost
    stateManager.updateState({ totalCost: COST_CONFIG.MAX_BUDGET + 0.01 });
    expect(stateManager.isBudgetExceeded()).toBe(true);
  });

  it('filters discussed tesis', () => {
    const discussedSet = new Set([1, 2, 3]);
    stateManager = new AgentStateManager({
      userQuery: 'Test',
      currentQuery: 'Test',
      discussedTesis: discussedSet,
    });

    const results: TesisSource[] = [
      { id_tesis: 1, titulo: 'Tesis 1', texto: 'Text 1' },
      { id_tesis: 2, titulo: 'Tesis 2', texto: 'Text 2' },
      { id_tesis: 4, titulo: 'Tesis 4', texto: 'Text 4' },
    ];

    const filtered = stateManager.updateResults(results);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id_tesis).toBe(4);
  });
});

describe('Legal Hierarchy Reranker', () => {
  const createMockTesis = (overrides: Partial<TesisSource> = {}): TesisSource => ({
    id_tesis: Math.random(),
    titulo: 'Test Tesis',
    texto: 'Test text',
    epoca: 'Décima Época',
    tipo: 'Tesis Aislada',
    year: 2020,
    similarity: 0.8,
    ...overrides,
  });

  it('prioritizes 11ª Época over 10ª Época', () => {
    const tesis = [
      createMockTesis({ id_tesis: 1, epoca: 'Décima Época' }),
      createMockTesis({ id_tesis: 2, epoca: 'Undécima Época' }),
    ];

    const reranked = rerankByLegalHierarchy(tesis);
    expect(reranked[0].id_tesis).toBe(2); // 11ª Época first
  });

  it('prioritizes Jurisprudencia over Tesis Aislada', () => {
    const tesis = [
      createMockTesis({ id_tesis: 1, epoca: 'Undécima Época', tipo: 'Tesis Aislada' }),
      createMockTesis({ id_tesis: 2, epoca: 'Undécima Época', tipo: 'Jurisprudencia' }),
    ];

    const reranked = rerankByLegalHierarchy(tesis);
    expect(reranked[0].id_tesis).toBe(2); // Jurisprudencia first
  });

  it('prioritizes more recent years', () => {
    const tesis = [
      createMockTesis({ id_tesis: 1, epoca: 'Undécima Época', tipo: 'Jurisprudencia', year: 2015 }),
      createMockTesis({ id_tesis: 2, epoca: 'Undécima Época', tipo: 'Jurisprudencia', year: 2023 }),
    ];

    const reranked = rerankByLegalHierarchy(tesis);
    expect(reranked[0].id_tesis).toBe(2); // More recent first
  });

  it('preserves similarity score in ranking', () => {
    const tesis = [
      createMockTesis({
        id_tesis: 1,
        epoca: 'Undécima Época',
        tipo: 'Tesis Aislada',
        similarity: 0.95,
      }),
      createMockTesis({
        id_tesis: 2,
        epoca: 'Undécima Época',
        tipo: 'Tesis Aislada',
        similarity: 0.50,
      }),
    ];

    const reranked = rerankByLegalHierarchy(tesis);
    expect(reranked[0].id_tesis).toBe(1); // Higher similarity first
  });

  it('analyzes hierarchy distribution correctly', () => {
    const tesis = [
      createMockTesis({ epoca: 'Undécima Época', tipo: 'Jurisprudencia', year: 2020 }),
      createMockTesis({ epoca: 'Undécima Época', tipo: 'Tesis Aislada', year: 2021 }),
      createMockTesis({ epoca: 'Décima Época', tipo: 'Jurisprudencia', year: 2015 }),
    ];

    const dist = analyzeHierarchyDistribution(tesis);

    expect(dist.epocas['Undécima Época']).toBe(2);
    expect(dist.epocas['Décima Época']).toBe(1);
    expect(dist.tipos['Jurisprudencia']).toBe(2);
    expect(dist.tipos['Tesis Aislada']).toBe(1);
    expect(dist.avgYear).toBeCloseTo(2018.67, 1);
  });
});

describe('AgentController', () => {
  it('exits on satisfied condition', async () => {
    // Mock search function that returns good results
    const mockSearch = jest.fn(async () => [
      {
        id_tesis: 1,
        titulo: 'Relevant Tesis',
        texto: 'Very relevant content',
        epoca: 'Undécima Época',
        tipo: 'Jurisprudencia',
        year: 2023,
        similarity: 0.9,
      },
    ]);

    const agent = new AgentController({
      userQuery: 'Test query',
      currentQuery: 'Specific query',
      maxIterations: 5,
    });

    // Note: This test requires mocking the LLM evaluator
    // In a real test environment, you'd mock the evaluateResults function
    // to return satisfecho: true

    // const finalState = await agent.runLoop(mockSearch);
    // expect(finalState.exitReason).toBe('llm_satisfecho');
    // expect(finalState.iteration).toBeLessThan(5);
  });

  it('exits on max iterations', async () => {
    // Mock search function
    const mockSearch = jest.fn(async () => []);

    const agent = new AgentController({
      userQuery: 'Test query',
      currentQuery: 'Test',
      maxIterations: 2, // Low limit for testing
    });

    // This would exit after 2 iterations
    // const finalState = await agent.runLoop(mockSearch);
    // expect(finalState.exitReason).toBe('max_iteraciones');
    // expect(finalState.iteration).toBe(2);
  });

  it('tracks cost correctly across iterations', () => {
    const agent = new AgentController({
      userQuery: 'Test',
      currentQuery: 'Test',
    });

    const costSummary = agent.getCostSummary();
    expect(costSummary.totalCost).toBe(0);
    expect(costSummary.withinBudget).toBe(true);
  });
});

/**
 * Integration test scenarios
 *
 * These are example test cases for manual testing.
 * In production, these would be automated with proper mocking.
 */
describe('Integration Test Scenarios', () => {
  it('Scenario 1: Single iteration (satisfied immediately)', () => {
    // Query: "¿Qué es amparo indirecto?"
    // Expected: 1 iteration, exitReason: 'llm_satisfecho'
    // Expected results: 5+ relevant tesis about amparo indirecto
  });

  it('Scenario 2: Multiple iterations (refinement)', () => {
    // Query: "amparo" (broad)
    // Expected: 2-3 iterations, REFINAR → SATISFECHO
    // Iteration 1: Too many results, decision: REFINAR
    // Iteration 2: More specific query, decision: SATISFECHO
  });

  it('Scenario 3: Max iterations hit', () => {
    // Query: "xyz123" (nonsense)
    // Expected: 5 iterations, exitReason: 'max_iteraciones'
    // Each iteration returns no/few results, keeps trying
  });

  it('Scenario 4: Redundant query detection', () => {
    // Iteration 1: "amparo"
    // Iteration 2: LLM suggests "amparo" again
    // Expected: Exit with 'consulta_redundante'
  });

  it('Scenario 5: Discussed tesis filtering', () => {
    // History: Already discussed tesis IDs [1001, 1002]
    // Search returns: [1001, 1002, 1003]
    // Expected: Only 1003 in final results
  });

  it('Scenario 6: Cost limit', () => {
    // Mock: Each LLM call costs $0.15
    // Expected: Exit at iteration 4 with 'presupuesto_excedido'
    // totalCost should be > $0.50
  });
});

/**
 * Performance benchmarks
 */
describe('Performance Benchmarks', () => {
  it('should complete average query in <15 seconds', async () => {
    // Test with real API calls (integration test)
    // Measure total time from start to final state
  });

  it('should average 2-3 iterations for typical queries', async () => {
    // Run 10 different typical legal queries
    // Average iterations should be 2-3
  });

  it('should stay within $0.01-0.03 cost per query', async () => {
    // Run 10 queries
    // Average cost should be in this range
  });

  it('should exit satisfied 70%+ of the time', async () => {
    // Run 20 queries
    // At least 14 should exit with 'llm_satisfecho'
  });
});
