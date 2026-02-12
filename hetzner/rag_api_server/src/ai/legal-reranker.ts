/**
 * Legal Hierarchy Reranker
 *
 * Reranks search results based on Mexican legal hierarchy:
 * - Época (11ª > 10ª > 9ª...)
 * - Tipo (Jurisprudencia > Tesis Aislada)
 * - Instancia (SCJN > Plenos > Tribunales)
 * - Year (more recent = better)
 * - Original similarity score
 */

import { TesisSource } from './agent-state';

/**
 * Época scoring - Most important factor
 */
const EPOCA_SCORES: Record<string, number> = {
  'Duodécima Época': 1100,  // 2024+ - newest época
  'Undécima Época': 1000,
  'Décima Época': 900,
  'Novena Época': 800,
  'Octava Época': 700,
  'Séptima Época': 600,
  'Sexta Época': 500,
  'Quinta Época': 400,
};

/**
 * Tipo scoring - Second most important
 */
const TIPO_SCORES: Record<string, number> = {
  'Jurisprudencia': 100,
  'Tesis Aislada': 50,
};

/**
 * Instancia scoring - Third most important
 */
const INSTANCIA_SCORES: Record<string, number> = {
  'SCJN': 30,
  'Primera Sala': 25,
  'Segunda Sala': 25,
  'Pleno': 20,
  'Tribunales Colegiados de Circuito': 15,
  'Tribunales Colegiados': 15,
  'Tribunal Colegiado': 15,
};

/**
 * Calculate year score (0-10 range)
 * More recent = higher score
 */
function calculateYearScore(year: number | undefined): number {
  if (!year) return 0;

  // Normalize year to 0-10 range
  // Base year 2000, span of 25 years
  const baseYear = 2000;
  const yearSpan = 25;
  const normalizedScore = ((year - baseYear) / yearSpan) * 10;

  // Clamp to 0-10
  return Math.max(0, Math.min(10, normalizedScore));
}

/**
 * Calculate similarity bonus (0-50 range)
 * Preserves original relevance score
 */
function calculateSimilarityBonus(similarity: number | undefined): number {
  if (!similarity) return 0;

  // Similarity is typically 0-1, multiply by 50 for bonus
  return Math.max(0, 50 * similarity);
}

/**
 * Extract instancia from TesisSource
 * FIX: Database has 'instancia' field, not 'organismo'
 */
function extractInstancia(tesis: TesisSource): string | null {
  // Try instancia field first (database field)
  const instancia = (tesis as any).instancia?.toLowerCase() || '';

  if (instancia) {
    if (instancia.includes('scjn') || instancia.includes('suprema corte')) {
      return 'SCJN';
    }
    if (instancia.includes('primera sala')) {
      return 'Primera Sala';
    }
    if (instancia.includes('segunda sala')) {
      return 'Segunda Sala';
    }
    if (instancia.includes('pleno')) {
      return 'Pleno';
    }
    if (instancia.includes('tribunal colegiado') || instancia.includes('tribunales colegiados')) {
      return 'Tribunales Colegiados de Circuito';
    }
  }

  // Fallback to organismo if instancia not found (for backwards compatibility)
  const organismo = tesis.organismo?.toLowerCase() || '';
  if (organismo) {
    if (organismo.includes('scjn') || organismo.includes('suprema corte')) {
      return 'SCJN';
    }
    if (organismo.includes('primera sala')) {
      return 'Primera Sala';
    }
    if (organismo.includes('segunda sala')) {
      return 'Segunda Sala';
    }
    if (organismo.includes('pleno')) {
      return 'Pleno';
    }
    if (organismo.includes('tribunal colegiado') || organismo.includes('tribunales colegiados')) {
      return 'Tribunales Colegiados de Circuito';
    }
  }

  return null;
}

/**
 * Calculate total score for a tesis
 */
function calculateTesisScore(tesis: TesisSource): number {
  let score = 0;

  // 1. Época (1000-400 range)
  const epocaScore = EPOCA_SCORES[tesis.epoca || ''] || 0;
  score += epocaScore;

  // 2. Tipo (100 or 50)
  const tipoScore = TIPO_SCORES[tesis.tipo || ''] || 0;
  score += tipoScore;

  // 3. Instancia (0-30 range)
  const instancia = extractInstancia(tesis);
  const instanciaScore = instancia ? (INSTANCIA_SCORES[instancia] || 0) : 0;
  score += instanciaScore;

  // 4. Year (0-10 range)
  const yearScore = calculateYearScore(tesis.year);
  score += yearScore;

  // 5. Similarity bonus (0-50 range)
  const similarityBonus = calculateSimilarityBonus(tesis.similarity);
  score += similarityBonus;

  return score;
}

/**
 * Rerank tesis by legal hierarchy
 *
 * Returns a sorted copy of the input array, preserving original array
 */
export function rerankByLegalHierarchy(tesis: TesisSource[]): TesisSource[] {
  // Create copy with scores
  const scored = tesis.map(t => ({
    ...t,
    _legalScore: calculateTesisScore(t),
  }));

  // Sort by score (descending)
  scored.sort((a, b) => b._legalScore - a._legalScore);

  // Remove score property and return
  return scored.map(({ _legalScore, ...rest }) => rest);
}

/**
 * Get top N tesis after reranking
 */
export function getTopReranked(tesis: TesisSource[], limit: number): TesisSource[] {
  const reranked = rerankByLegalHierarchy(tesis);
  return reranked.slice(0, limit);
}

/**
 * Get reranking debug info for logging
 */
export function getRerankedWithScores(tesis: TesisSource[]): Array<TesisSource & { score: number }> {
  const scored = tesis.map(t => ({
    ...t,
    score: calculateTesisScore(t),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Analyze distribution of results by legal hierarchy
 */
export interface HierarchyDistribution {
  epocas: Record<string, number>;
  tipos: Record<string, number>;
  instancias: Record<string, number>;
  avgYear: number;
  avgSimilarity: number;
}

export function analyzeHierarchyDistribution(tesis: TesisSource[]): HierarchyDistribution {
  const distribution: HierarchyDistribution = {
    epocas: {},
    tipos: {},
    instancias: {},
    avgYear: 0,
    avgSimilarity: 0,
  };

  if (tesis.length === 0) return distribution;

  let totalYear = 0;
  let totalSimilarity = 0;
  let yearCount = 0;
  let similarityCount = 0;

  tesis.forEach(t => {
    // Count épocas
    if (t.epoca) {
      distribution.epocas[t.epoca] = (distribution.epocas[t.epoca] || 0) + 1;
    }

    // Count tipos
    if (t.tipo) {
      distribution.tipos[t.tipo] = (distribution.tipos[t.tipo] || 0) + 1;
    }

    // Count instancias
    const instancia = extractInstancia(t);
    if (instancia) {
      distribution.instancias[instancia] = (distribution.instancias[instancia] || 0) + 1;
    }

    // Sum for averages
    if (t.year) {
      totalYear += t.year;
      yearCount++;
    }
    if (t.similarity) {
      totalSimilarity += t.similarity;
      similarityCount++;
    }
  });

  distribution.avgYear = yearCount > 0 ? totalYear / yearCount : 0;
  distribution.avgSimilarity = similarityCount > 0 ? totalSimilarity / similarityCount : 0;

  return distribution;
}
