/**
 * Agent Controller - Main agentic loop controller
 *
 * Orchestrates the multi-step RAG agent loop:
 * 1. Search with current query
 * 2. Filter discussed tesis
 * 3. Rerank by legal hierarchy
 * 4. Evaluate with LLM
 * 5. Check exit conditions (5 reasons)
 * 6. Prepare next iteration
 */

import {
  AgentState,
  AgentStateManager,
  TesisSource,
  ExitReason,
  COST_CONFIG,
} from './agent-state';
import { rerankByLegalHierarchy, analyzeHierarchyDistribution } from './legal-reranker';
import { evaluateResults, evaluateEmptyResults } from './quality-evaluator';
import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { agentTools } from './tools';

export interface AgentControllerConfig {
  userQuery: string;
  currentQuery: string;
  maxIterations?: number;
  discussedTesis?: Set<number>;
  historicalSources?: TesisSource[];
}

export interface ContinueDecision {
  continue: boolean;
  reason?: ExitReason;
}

/**
 * Main Agent Controller
 */
export class AgentController {
  private stateManager: AgentStateManager;

  constructor(config: AgentControllerConfig) {
    this.stateManager = new AgentStateManager({
      userQuery: config.userQuery,
      currentQuery: config.currentQuery,
      maxIterations: config.maxIterations || 3,
      discussedTesis: config.discussedTesis || new Set(),
      historicalSources: config.historicalSources || [],
    });

    // Add initial query to history
    this.stateManager.addToQueryHistory(config.currentQuery);
  }

  /**
   * Main agent loop
   *
   * Agent now uses tools internally - no external search function needed
   *
   * @returns Final agent state after exit
   */
  async runLoop(): Promise<AgentState> {
    console.log('[Agent] Starting agentic RAG loop');
    console.log(`[Agent] User query: "${this.stateManager.getState().userQuery}"`);
    console.log(`[Agent] Initial query: "${this.stateManager.getState().currentQuery}"`);

    let shouldContinue = true;

    while (shouldContinue) {
      const state = this.stateManager.getState();
      console.log(`\n[Agent] === Iteration ${state.iteration + 1}/${state.maxIterations} ===`);
      console.log(`[Agent] Current query: "${state.currentQuery}"`);

      // 1. Execute tools via AI SDK
      console.log('[Agent] Calling LLM with tools...');

      const discussedIds = Array.from(state.discussedTesis);
      let rawResults: TesisSource[] = [];
      let toolsUsed: string[] = [];

      try {
        // Call LLM with tools
        const result = await generateText({
          model: openai('gpt-4o-mini'),
          tools: agentTools,
          stopWhen: stepCountIs(3), // CRITICAL: Allow multi-step tool execution
          messages: [
            {
              role: 'system',
              content: `Eres un agente de investigación legal especializado en jurisprudencia mexicana.

Tu tarea: Encontrar tesis relevantes para la pregunta del usuario.

PREGUNTA DEL USUARIO: "${state.userQuery}"

ITERACIÓN ACTUAL: ${state.iteration + 1} de ${state.maxIterations}

TESIS YA DISCUTIDAS (excluir estas): ${discussedIds.length > 0 ? discussedIds.join(', ') : 'Ninguna'}

HERRAMIENTAS DISPONIBLES:
1. searchTesis - Búsqueda semántica (usa esta primero con el parámetro excludeIds)
2. getDatabaseStats - Consultar qué temas existen en la base de datos
3. findRelatedTesis - Encontrar tesis similares a una conocida
4. getTesisByID - Obtener detalles de una tesis específica
5. executeReadOnlySQL - Consultas personalizadas (último recurso)

INSTRUCCIONES CRÍTICAS:
- ANALIZA si la pregunta del usuario tiene MÚLTIPLES aspectos o preguntas distintas
- Si hay múltiples preguntas, llama searchTesis VARIAS VECES (una por cada aspecto)
- Query sugerida inicial: "${state.currentQuery}"
- Si hay tesis discutidas, pásalas como excludeIds: [${discussedIds.join(',')}]
- Enfócate en encontrar tesis NUEVAS que no se hayan discutido
- Solo usa otras herramientas si searchTesis devuelve resultados insuficientes

EJEMPLOS:
- Pregunta simple: "¿Qué es amparo indirecto?" → 1 búsqueda
- Pregunta múltiple: "¿Criterios para suspensión? ¿Diferencia ISR vs IVA?" → 2 búsquedas:
  1. searchTesis(query="suspensión fiscal criterios")
  2. searchTesis(query="ISR IVA diferencias tributarias")

Llama a searchTesis ahora (una o más veces según la complejidad).`,
            },
          ],
          onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
            console.log(`[Agent] Step finished: ${finishReason}`);
            if (toolCalls && toolCalls.length > 0) {
              console.log(`[Agent] Tool calls: ${toolCalls.map((tc: any) => tc.toolName).join(', ')}`);
            }
            if (toolResults && toolResults.length > 0) {
              console.log(`[Agent] Tool results: ${toolResults.length} results received`);
            }
          },
        });

        console.log(`[Agent] LLM completed with ${result.steps.length} steps`);
        console.log(`[Agent] Finish reason: ${result.finishReason}`);

        // Extract all tool results from ALL steps
        for (const step of result.steps) {
          for (const toolResult of step.toolResults || []) {
            const toolName = toolResult.toolName;
            toolsUsed.push(toolName);

            console.log(`[Agent] Processing tool result: ${toolName}`);

            // Extract tesis from different tools
            // Note: AI SDK uses "output" property, not "result"
            const output = (toolResult as any).output;

            if (toolName === 'searchTesis' && output?.tesis) {
              // Map tool output format to agent TesisSource format
              const mappedTesis = output.tesis.map((t: any) => ({
                ...t,
                titulo: t.rubro || t.titulo,           // Map rubro → titulo
                tipo: t.tipo_tesis || t.tipo,          // Map tipo_tesis → tipo
                year: t.anio || t.year,                // Map anio → year
              }));
              rawResults.push(...mappedTesis);
              console.log(`[Agent] searchTesis returned ${output.tesis.length} tesis`);
            } else if (toolName === 'findRelatedTesis' && output?.relatedTesis) {
              const mappedTesis = output.relatedTesis.map((t: any) => ({
                ...t,
                titulo: t.rubro || t.titulo,
                tipo: t.tipo_tesis || t.tipo,
                year: t.anio || t.year,
              }));
              rawResults.push(...mappedTesis);
              console.log(`[Agent] findRelatedTesis returned ${output.relatedTesis.length} tesis`);
            } else if (toolName === 'getTesisByID' && output && !output.error) {
              const mappedTesis = {
                ...output,
                titulo: output.rubro || output.titulo,
                tipo: output.tipo_tesis || output.tipo,
                year: output.anio || output.year,
              };
              rawResults.push(mappedTesis);
              console.log(`[Agent] getTesisByID returned 1 tesis`);
            }
            // Note: getDatabaseStats and executeReadOnlySQL don't return tesis
          }
        }

        console.log(`[Agent] Total collected from tools: ${rawResults.length} tesis`);

        // Update cost tracking
        // Each step with tools costs: 1 LLM call + 1 embedding (inside tool)
        const embeddingCalls = result.steps.filter(s => s.toolResults && s.toolResults.length > 0).length;
        const llmCalls = result.steps.length;

        this.stateManager.updateCost(embeddingCalls, llmCalls);
        console.log(`[Agent] Cost: ${embeddingCalls} embeddings + ${llmCalls} LLM calls`);

      } catch (error) {
        console.error('[Agent] Tool execution error:', error);
        rawResults = [];
      }

      // 2. Filter discussed tesis
      const filteredResults = this.stateManager.updateResults(rawResults);
      console.log(`[Agent] After filtering discussed: ${filteredResults.length}`);

      // 3. Rerank by legal hierarchy
      const reranked = rerankByLegalHierarchy(filteredResults);
      console.log('[Agent] Results reranked by legal hierarchy');

      // Log distribution
      const dist = analyzeHierarchyDistribution(reranked);
      console.log('[Agent] Distribution:', {
        epocas: Object.keys(dist.epocas).length,
        tipos: Object.keys(dist.tipos).length,
        avgYear: Math.round(dist.avgYear),
      });

      // 4. Update state (cost already updated in tool section)
      this.stateManager.updateState({ currentResults: reranked });

      // 5. Evaluate results
      let evaluation;

      if (reranked.length === 0) {
        // Skip LLM call for empty results
        evaluation = evaluateEmptyResults(state.currentQuery, state.iteration);
        console.log('[Agent] Empty results - skipped LLM evaluation');
      } else {
        // Programmatic SATISFECHO check - no LLM needed for clear cases
        const sim = (r: TesisSource) => r.similarity || 0;
        const above70 = reranked.filter(r => sim(r) >= 0.70).length;
        const above65 = reranked.filter(r => sim(r) >= 0.65).length;
        const above60 = reranked.filter(r => sim(r) >= 0.60).length;
        const isLastIteration = (state.iteration + 1) >= state.maxIterations;

        if (above70 >= 2 || above65 >= 3 || above60 >= 5) {
          console.log(`[Agent] Programmatic SATISFECHO: ${above70}>=70%, ${above65}>=65%, ${above60}>=60%`);
          evaluation = {
            satisfecho: true,
            decision: 'SATISFECHO' as const,
            razonamiento: `Criterio cumplido: ${above70} tesis >70%, ${above65} tesis >65%, ${above60} tesis >60%`,
            siguienteConsulta: null,
            confianza: 0.9,
          };
        } else if (isLastIteration) {
          // Last iteration — accept whatever we have, don't waste an LLM call
          console.log(`[Agent] Last iteration: accepting ${reranked.length} results without LLM call`);
          evaluation = {
            satisfecho: true,
            decision: 'SATISFECHO' as const,
            razonamiento: `Última iteración: ${reranked.length} resultados disponibles`,
            siguienteConsulta: null,
            confianza: 0.6,
          };
        } else {
          // Borderline case — call LLM to decide strategy and next query
          console.log('[Agent] Borderline results - calling LLM evaluator');
          evaluation = await evaluateResults(
            state.userQuery,
            state.currentQuery,
            reranked,
            state.iteration,
            state.queryHistory,
            toolsUsed
          );
          this.stateManager.updateCost(0, 1); // 1 LLM call for evaluation
        }
      }

      // Update state with evaluation
      this.stateManager.updateEvaluation(evaluation);
      console.log('[Agent] Evaluation result:', {
        satisfecho: evaluation.satisfecho,
        decision: evaluation.decision,
        confianza: evaluation.confianza,
      });
      console.log(`[Agent] Razonamiento: ${evaluation.razonamiento}`);

      // 6. Increment iteration
      this.stateManager.incrementIteration();

      // 7. Check if should continue
      const decision = this.shouldContinue();
      shouldContinue = decision.continue;

      if (!decision.continue) {
        this.stateManager.setExitReason(decision.reason!);
        console.log(`[Agent] Exiting loop: ${decision.reason}`);
        break;
      }

      // 8. Prepare next iteration
      if (evaluation.siguienteConsulta) {
        this.stateManager.updateState({
          currentQuery: evaluation.siguienteConsulta,
        });
        this.stateManager.addToQueryHistory(evaluation.siguienteConsulta);
        console.log(`[Agent] Next query: "${evaluation.siguienteConsulta}"`);
      }
    }

    // Final summary
    const finalState = this.stateManager.getState();
    console.log('\n[Agent] === Final Summary ===');
    console.log(this.stateManager.getSummary());
    console.log(`[Agent] Total results collected: ${finalState.allResults.length}`);
    console.log(`[Agent] Final results: ${finalState.currentResults.length}`);
    console.log(`[Agent] Query history: ${finalState.queryHistory.join(' → ')}`);

    return finalState;
  }

  /**
   * Check if agent should continue or exit
   *
   * 5 exit conditions:
   * 1. LLM satisfied
   * 2. Max iterations reached
   * 3. Redundant query (already searched)
   * 4. Budget exceeded
   * 5. No next query provided
   */
  private shouldContinue(): ContinueDecision {
    const state = this.stateManager.getState();

    // 1. LLM satisfied
    if (state.satisfecho) {
      return { continue: false, reason: 'llm_satisfecho' };
    }

    // 2. Max iterations
    if (state.iteration >= state.maxIterations) {
      return { continue: false, reason: 'max_iteraciones' };
    }

    // 3. No next query
    if (!state.siguienteConsulta || state.siguienteConsulta.trim() === '') {
      return { continue: false, reason: 'sin_siguiente_consulta' };
    }

    // 4. Redundant query
    if (this.stateManager.isQueryRedundant(state.siguienteConsulta)) {
      return { continue: false, reason: 'consulta_redundante' };
    }

    // 5. Budget exceeded
    if (this.stateManager.isBudgetExceeded()) {
      return { continue: false, reason: 'presupuesto_excedido' };
    }

    return { continue: true };
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<AgentState> {
    return this.stateManager.getState();
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    totalCost: number;
    embeddingCalls: number;
    llmCalls: number;
    withinBudget: boolean;
  } {
    const state = this.stateManager.getState();
    return {
      totalCost: state.totalCost,
      embeddingCalls: state.embeddingCalls,
      llmCalls: state.llmCalls,
      withinBudget: state.totalCost <= COST_CONFIG.MAX_BUDGET,
    };
  }
}
