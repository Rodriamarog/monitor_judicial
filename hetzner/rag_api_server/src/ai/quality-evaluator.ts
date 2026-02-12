/**
 * Quality Evaluator - LLM-driven result evaluation
 *
 * Evaluates search results using an LLM to determine:
 * - Are results relevant to the user's question?
 * - Do we have authoritative sources (Jurisprudencia, 11ª Época)?
 * - Do we have sufficient quantity (3-5+ results)?
 * - Can we answer the question completely?
 *
 * Returns decision: SATISFECHO, REFINAR, AMPLIAR, or FILTRAR
 */

import OpenAI from 'openai';
import { TesisSource, EvaluationResult } from './agent-state';
import { analyzeHierarchyDistribution } from './legal-reranker';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evaluation prompt template
 */
function buildEvaluationPrompt(
  userQuery: string,
  currentQuery: string,
  results: TesisSource[],
  iteration: number,
  queryHistory: string[],
  toolsUsed?: string[]
): string {
  // Get distribution stats
  const dist = analyzeHierarchyDistribution(results);

  // Format época counts
  const epocaCounts = Object.entries(dist.epocas)
    .map(([epoca, count]) => `${epoca}: ${count}`)
    .join(', ');

  // Format tipo counts
  const tipoCounts = Object.entries(dist.tipos)
    .map(([tipo, count]) => `${tipo}: ${count}`)
    .join(', ');

  // Format query history
  const historyText = queryHistory.length > 0
    ? `\nCONSULTAS PREVIAS:\n${queryHistory.map((q, i) => `${i + 1}. "${q}"`).join('\n')}`
    : '';

  // Format results with varying detail levels
  // Top 3: Full content for deep analysis
  const top3Full = results.slice(0, 3).map((r, i) => {
    const similarity = r.similarity ? `(${(r.similarity * 100).toFixed(0)}% relevancia)` : '';
    const instancia = (r as any).instancia || 'N/A';
    return `${i + 1}. ${similarity} [${r.epoca || 'N/A'}] [${r.tipo || 'N/A'}] [${instancia}]
   Título: ${r.titulo}
   Contenido completo: ${r.texto || 'No disponible'}`;
  }).join('\n\n');

  // Next 2: Medium preview
  const next2Medium = results.slice(3, 5).map((r, i) => {
    const similarity = r.similarity ? `(${(r.similarity * 100).toFixed(0)}% relevancia)` : '';
    const preview = r.texto ? r.texto.substring(0, 300) + '...' : 'No disponible';
    return `${i + 4}. ${similarity} [${r.epoca || 'N/A'}] [${r.tipo || 'N/A'}]
   Título: ${r.titulo}
   Vista previa: ${preview}`;
  }).join('\n\n');

  // Rest: Short preview
  const restShort = results.slice(5, 10).map((r, i) => {
    const similarity = r.similarity ? `(${(r.similarity * 100).toFixed(0)}% relevancia)` : '';
    const preview = r.texto ? r.texto.substring(0, 100) + '...' : 'No disponible';
    return `${i + 6}. ${similarity} [${r.epoca || 'N/A'}] [${r.tipo || 'N/A'}] ${r.titulo}
   ${preview}`;
  }).join('\n');

  const formattedResults = [top3Full, next2Medium, restShort].filter(Boolean).join('\n\n---\n\n');

  // Check for high-quality results based on similarity
  const highQualityCount = results.filter(r => (r.similarity || 0) >= 0.65).length;
  const veryHighQualityCount = results.filter(r => (r.similarity || 0) >= 0.75).length;
  const lowQualityCount = results.filter(r => (r.similarity || 0) < 0.50).length;
  const bestSimilarity = results.length > 0 ? Math.max(...results.map(r => r.similarity || 0)) : 0;

  let qualityHint = '';
  if (highQualityCount >= 3) {
    qualityHint = `\n\n⚠️ NOTA POSITIVA: Hay ${highQualityCount} tesis con >65% de relevancia semántica (${veryHighQualityCount} con >75%). Considera si estos resultados son suficientes para responder la pregunta.`;
  } else if (bestSimilarity < 0.50) {
    qualityHint = `\n\n⚠️ ALERTA DE BAJA CALIDAD: El mejor resultado tiene solo ${(bestSimilarity * 100).toFixed(0)}% de relevancia (<50%). Estos resultados probablemente NO son relevantes. Considera AMPLIAR la búsqueda o reconocer que puede no haber jurisprudencia sobre este tema específico.`;
  } else if (lowQualityCount > results.length / 2) {
    qualityHint = `\n\n⚠️ NOTA: ${lowQualityCount} de ${results.length} resultados tienen <50% de relevancia. La mayoría son de baja calidad. Revisa si los pocos resultados >50% son realmente útiles.`;
  }

  return `Eres un experto en derecho mexicano evaluando resultados de búsqueda de tesis y jurisprudencia.

PREGUNTA DEL USUARIO:
"${userQuery}"

CONSULTA ACTUAL (Iteración ${iteration}):
"${currentQuery}"
${historyText}

RESULTADOS ENCONTRADOS: ${results.length}

DISTRIBUCIÓN:
- Épocas: ${epocaCounts || 'ninguna'}
- Tipos: ${tipoCounts || 'ninguna'}
- Año promedio: ${dist.avgYear > 0 ? Math.round(dist.avgYear) : 'N/A'}
- Alta relevancia (>65%): ${highQualityCount}
- Muy alta relevancia (>75%): ${veryHighQualityCount}${qualityHint}

RESULTADOS DETALLADOS:
${formattedResults || 'No hay resultados'}

CRITERIOS DE EVALUACIÓN:

1. **Relevancia Semántica**: Confía en los porcentajes de relevancia
   - >75%: Muy alta coincidencia semántica - altamente relevante
   - 65-75%: Alta coincidencia - probablemente relevante
   - 50-65%: Coincidencia moderada - revisar contenido cuidadosamente
   - 40-50%: Baja coincidencia - generalmente no relevante
   - <40%: Muy baja coincidencia - NO relevante, cambiar estrategia

   ⚠️ UMBRAL MÍNIMO DE CALIDAD:
   - Si el mejor resultado tiene <50% de relevancia, los resultados NO son suficientes
   - Si todos los resultados tienen <60% de relevancia, probablemente necesitas REFINAR o AMPLIAR
   - Si los 3 mejores resultados tienen <50%, definitivamente necesitas cambiar la estrategia

   IMPORTANTE: Si hay 2+ tesis con >70% de relevancia, es muy probable que sean útiles.
   Lee el contenido completo de las 3 primeras tesis para confirmar.

2. **Relevancia de Contenido**: Lee el contenido completo de las 3 primeras
   - ¿El texto de la tesis realmente responde la pregunta del usuario?
   - ¿Los conceptos jurídicos coinciden con lo que busca el usuario?
   - No juzgues solo por el título - el contenido es lo que importa

3. **Autoridad**: ¿Tenemos fuentes autoritativas?
   - Ideal: Jurisprudencia de 11ª o 12ª Época de SCJN
   - Bueno: Jurisprudencia de 10ª Época o Tesis Aisladas recientes de SCJN
   - Aceptable: Tesis de Tribunales Colegiados de 11ª Época
   - Insuficiente: Solo tesis antiguas o de baja jerarquía

4. **Cantidad**: ¿Tenemos suficientes resultados de calidad?
   - Ideal: 3+ tesis con >65% de relevancia
   - Aceptable: 2 tesis con >70% de relevancia
   - Insuficiente: <2 tesis relevantes

5. **Completitud**: ¿Podemos responder completamente la pregunta?
   - Completa: Sí, con confianza alta
   - Parcial: Podemos dar una respuesta pero falta contexto
   - Incompleta: No podemos responder adecuadamente

JERARQUÍA LEGAL (en orden de importancia):
- 11ª Época > 10ª Época > 9ª Época > épocas anteriores
- Jurisprudencia > Tesis Aislada
- SCJN > Plenos > Tribunales Colegiados

DECISIONES DISPONIBLES:

1. **SATISFECHO**: Los resultados son suficientes para responder la pregunta
   - Usar cuando:
     * Tenemos 2+ tesis con >70% de relevancia semántica Y contenido confirmado como relevante, O
     * Tenemos 3+ tesis con >65% de relevancia semántica de buena autoridad, O
     * Tenemos 5+ tesis con >60% de relevancia que en conjunto responden la pregunta

   - ⚠️ NO USAR SATISFECHO si:
     * El mejor resultado tiene <50% de relevancia
     * Menos de 2 tesis tienen >60% de relevancia
     * El contenido no responde realmente la pregunta (incluso con alta similitud)

   - IMPORTANTE: Si ya encontramos tesis útiles, no sigas buscando la perfección
   - siguiente_consulta: null

2. **REFINAR**: Necesitamos palabras clave más específicas
   - Usar cuando: Tenemos resultados pero muchos son irrelevantes
   - siguiente_consulta: Versión más específica de la consulta

3. **AMPLIAR**: Necesitamos una búsqueda más amplia
   - Usar cuando: Muy pocos resultados (<3) o todos son muy específicos
   - También usar cuando: Todos los resultados tienen <50% de relevancia (tema posiblemente muy nuevo o no existe jurisprudencia)
   - siguiente_consulta: Versión más general o con términos relacionados
   - Si ya intentaste 2+ consultas y sigue <50%, considera que puede no haber jurisprudencia sobre el tema

4. **FILTRAR**: Demasiados resultados irrelevantes
   - Usar cuando: >10 resultados pero baja relevancia promedio (<55%)
   - siguiente_consulta: Agregar filtros o términos más específicos

IMPORTANTE:
- Si ya hiciste consultas similares antes, evita repetirlas
- Considera que estamos en iteración ${iteration} de máximo 5
- **Sé conservador pero honesto**:
  * Si 2-3 tesis tienen >70% de relevancia Y contenido útil → marca SATISFECHO
  * Si todos tienen <50% de relevancia → NO marques SATISFECHO, intenta AMPLIAR o reconoce falta de jurisprudencia
- No busques la perfección - "suficientemente bueno" es mejor que iterar sin fin
- Confía en los porcentajes de similitud - fueron calculados por embeddings especializados en derecho
- **Umbral mínimo**: Si el mejor resultado <50%, los resultados NO son adecuados
- No hagas la siguiente consulta demasiado específica (evita combinar muchos términos)
- Si estamos en iteración 4 o 5 y hay resultados >60%, considera marcar SATISFECHO
- ⚠️ Es mejor ser honesto sobre falta de jurisprudencia que dar resultados irrelevantes
${toolsUsed && toolsUsed.length > 0 ? `\n\nHERRAMIENTAS USADAS EN ESTA ITERACIÓN: ${toolsUsed.join(', ')}\n\nCONSIDERA:\n- ¿El agente probó diferentes estrategias de búsqueda?\n- Si searchTesis no devolvió nada, sugiere usar getDatabaseStats para explorar\n- Si ya tienes algunos resultados, sugiere findRelatedTesis para explorar tesis similares\n- ¿Puede el agente probar otras herramientas o enfoques diferentes?` : ''}

RESPONDE EN JSON (solo JSON válido, sin texto adicional):
{
  "satisfecho": true o false,
  "decision": "SATISFECHO" | "REFINAR" | "AMPLIAR" | "FILTRAR",
  "razonamiento": "Explicación breve de tu decisión (2-3 oraciones)",
  "siguiente_consulta": "Nueva consulta para siguiente iteración" o null,
  "confianza": 0.0 a 1.0
}`;
}

/**
 * Evaluate search results using LLM
 */
export async function evaluateResults(
  userQuery: string,
  currentQuery: string,
  results: TesisSource[],
  iteration: number,
  queryHistory: string[],
  toolsUsed?: string[]
): Promise<EvaluationResult> {
  const prompt = buildEvaluationPrompt(
    userQuery,
    currentQuery,
    results,
    iteration,
    queryHistory,
    toolsUsed
  );

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en derecho mexicano. Responde SOLO con JSON válido, sin texto adicional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate and return
    const evaluation: EvaluationResult = {
      satisfecho: Boolean(parsed.satisfecho),
      decision: validateDecision(parsed.decision),
      razonamiento: String(parsed.razonamiento || 'No razonamiento proporcionado'),
      siguienteConsulta: parsed.siguiente_consulta ? String(parsed.siguiente_consulta) : null,
      confianza: Math.max(0, Math.min(1, Number(parsed.confianza || 0.5))),
    };

    // If satisfecho is true, force decision to SATISFECHO
    if (evaluation.satisfecho) {
      evaluation.decision = 'SATISFECHO';
      evaluation.siguienteConsulta = null;
    }

    return evaluation;
  } catch (error) {
    console.error('[Evaluator] Error evaluating results:', error);

    // Fallback: conservative decision
    return {
      satisfecho: results.length >= 5,
      decision: results.length >= 5 ? 'SATISFECHO' : 'AMPLIAR',
      razonamiento: `Error en evaluación LLM. Decisión automática basada en cantidad (${results.length} resultados).`,
      siguienteConsulta: results.length >= 5 ? null : currentQuery,
      confianza: 0.3,
    };
  }
}

/**
 * Validate decision enum
 */
function validateDecision(decision: any): 'SATISFECHO' | 'REFINAR' | 'AMPLIAR' | 'FILTRAR' {
  const validDecisions = ['SATISFECHO', 'REFINAR', 'AMPLIAR', 'FILTRAR'];

  if (typeof decision === 'string' && validDecisions.includes(decision.toUpperCase())) {
    return decision.toUpperCase() as any;
  }

  // Default to SATISFECHO if invalid
  return 'SATISFECHO';
}

/**
 * Quick evaluation for empty results (skip LLM call)
 */
export function evaluateEmptyResults(
  currentQuery: string,
  iteration: number
): EvaluationResult {
  return {
    satisfecho: false,
    decision: 'AMPLIAR',
    razonamiento: 'No se encontraron resultados. Se necesita una búsqueda más amplia.',
    siguienteConsulta: currentQuery,
    confianza: 0.2,
  };
}
