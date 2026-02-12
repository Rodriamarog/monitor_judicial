/**
 * Agent State Management for Agentic RAG System
 *
 * Tracks iteration state, costs, decisions, and exit conditions
 * for the multi-step RAG agent loop.
 */

export interface TesisSource {
  id_tesis: number;
  titulo: string;
  texto: string;
  epoca?: string;
  tipo?: string;
  year?: number;
  similarity?: number;
  [key: string]: any;
}

export type AgentDecision = 'SATISFECHO' | 'REFINAR' | 'AMPLIAR' | 'FILTRAR';

export type ExitReason =
  | 'llm_satisfecho'
  | 'max_iteraciones'
  | 'consulta_redundante'
  | 'presupuesto_excedido'
  | 'sin_siguiente_consulta';

export interface EvaluationResult {
  satisfecho: boolean;
  decision: AgentDecision;
  razonamiento: string;
  siguienteConsulta: string | null;
  confianza: number;
}

export interface AgentState {
  // User and query context
  userQuery: string;
  currentQuery: string;

  // Iteration tracking
  iteration: number;
  maxIterations: number;
  queryHistory: string[];

  // LLM decisions
  satisfecho: boolean;
  decision: AgentDecision | null;
  razonamiento: string;
  siguienteConsulta: string | null;
  confianza: number;

  // Results tracking
  currentResults: TesisSource[];
  allResults: TesisSource[];

  // Cost tracking
  totalCost: number;
  embeddingCalls: number;
  llmCalls: number;

  // Exit tracking
  exitReason: ExitReason | null;

  // Conversation context
  discussedTesis: Set<number>;
  historicalSources: TesisSource[];
}

/**
 * Cost constants for OpenAI API
 * Based on OpenAI pricing as of 2025
 */
export const COST_CONFIG = {
  // text-embedding-3-small
  EMBEDDING_COST_PER_1K: 0.00002,

  // gpt-4o-mini (default for evaluation)
  LLM_INPUT_COST_PER_1K: 0.00015,
  LLM_OUTPUT_COST_PER_1K: 0.0006,

  // Average token estimates
  AVG_EMBEDDING_TOKENS: 20,
  AVG_LLM_INPUT_TOKENS: 1000,
  AVG_LLM_OUTPUT_TOKENS: 500,

  // Hard budget limit
  MAX_BUDGET: 0.50,
};

/**
 * AgentStateManager - Manages state updates and cost tracking
 */
export class AgentStateManager {
  private state: AgentState;

  constructor(initialState: Partial<AgentState>) {
    this.state = {
      userQuery: initialState.userQuery || '',
      currentQuery: initialState.currentQuery || '',
      iteration: 0,
      maxIterations: initialState.maxIterations || 5,
      queryHistory: initialState.queryHistory || [],
      satisfecho: false,
      decision: null,
      razonamiento: '',
      siguienteConsulta: null,
      confianza: 0,
      currentResults: [],
      allResults: [],
      totalCost: 0,
      embeddingCalls: 0,
      llmCalls: 0,
      exitReason: null,
      discussedTesis: initialState.discussedTesis || new Set(),
      historicalSources: initialState.historicalSources || [],
    };
  }

  /**
   * Get current state (immutable copy)
   */
  getState(): Readonly<AgentState> {
    return { ...this.state };
  }

  /**
   * Update state with partial changes
   */
  updateState(updates: Partial<AgentState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Update cost based on API calls
   */
  updateCost(embeddingCalls: number = 0, llmCalls: number = 0): void {
    const embeddingCost = embeddingCalls *
      (COST_CONFIG.AVG_EMBEDDING_TOKENS / 1000) *
      COST_CONFIG.EMBEDDING_COST_PER_1K;

    const llmInputCost = llmCalls *
      (COST_CONFIG.AVG_LLM_INPUT_TOKENS / 1000) *
      COST_CONFIG.LLM_INPUT_COST_PER_1K;

    const llmOutputCost = llmCalls *
      (COST_CONFIG.AVG_LLM_OUTPUT_TOKENS / 1000) *
      COST_CONFIG.LLM_OUTPUT_COST_PER_1K;

    this.state.embeddingCalls += embeddingCalls;
    this.state.llmCalls += llmCalls;
    this.state.totalCost += embeddingCost + llmInputCost + llmOutputCost;
  }

  /**
   * Increment iteration counter
   */
  incrementIteration(): void {
    this.state.iteration += 1;
  }

  /**
   * Add query to history
   */
  addToQueryHistory(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    if (!this.state.queryHistory.includes(normalizedQuery)) {
      this.state.queryHistory.push(normalizedQuery);
    }
  }

  /**
   * Check if query is redundant (already searched)
   */
  isQueryRedundant(query: string): boolean {
    const normalized = query.toLowerCase().trim();
    return this.state.queryHistory.includes(normalized);
  }

  /**
   * Check if budget limit exceeded
   */
  isBudgetExceeded(): boolean {
    return this.state.totalCost > COST_CONFIG.MAX_BUDGET;
  }

  /**
   * Update results and filter discussed tesis
   */
  updateResults(newResults: TesisSource[]): TesisSource[] {
    // Filter out already discussed tesis
    const filtered = newResults.filter(
      r => !this.state.discussedTesis.has(r.id_tesis)
    );

    // Update state
    this.state.currentResults = filtered;
    this.state.allResults.push(...filtered);

    // Add to discussed set
    filtered.forEach(r => this.state.discussedTesis.add(r.id_tesis));

    return filtered;
  }

  /**
   * Update evaluation results
   */
  updateEvaluation(evaluation: EvaluationResult): void {
    this.state.satisfecho = evaluation.satisfecho;
    this.state.decision = evaluation.decision;
    this.state.razonamiento = evaluation.razonamiento;
    this.state.siguienteConsulta = evaluation.siguienteConsulta;
    this.state.confianza = evaluation.confianza;
  }

  /**
   * Set exit reason and finalize state
   */
  setExitReason(reason: ExitReason): void {
    this.state.exitReason = reason;
  }

  /**
   * Get formatted state summary for logging
   */
  getSummary(): string {
    return `[Agent] Iteration ${this.state.iteration}/${this.state.maxIterations} | ` +
           `Cost: $${this.state.totalCost.toFixed(4)} | ` +
           `Results: ${this.state.currentResults.length} | ` +
           `Decision: ${this.state.decision || 'N/A'} | ` +
           `Exit: ${this.state.exitReason || 'running'}`;
  }
}
