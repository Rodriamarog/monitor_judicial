/**
 * Juzgado Name Normalization
 *
 * Truncates juzgado names after the city name to remove suffixes like:
 * - ", B.C. LISTA"
 * - ", DEL"
 * - ", B.C. LISTA (BOLETIN) DEL"
 *
 * Example:
 * "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA, B.C. LISTA (BOLETIN) DEL"
 * → "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA"
 */

/**
 * Normalizes a juzgado name by truncating everything after the city name
 * @param juzgado - The juzgado name to normalize
 * @returns Normalized juzgado name
 */
export function normalizeJuzgado(juzgado: string): string {
  const trimmed = juzgado.trim();
  if (!trimmed) return '';

  // Convert to uppercase for matching (we'll preserve original case in result)
  const upper = trimmed.toUpperCase();

  // Baja California cities ordered by length (longest first to avoid partial matches)
  // For example, "PLAYAS DE ROSARITO" must be checked before "ROSARITO"
  const cities = [
    'PLAYAS DE ROSARITO',
    'GUADALUPE VICTORIA',
    'CIUDAD MORELOS',
    'SAN QUINTÍN',
    'SAN QUINTIN', // without accent (bulletins sometimes omit accents)
    'CD. MORELOS', // common abbreviation
    'SAN FELIPE',
    'MEXICALI',
    'ENSENADA',
    'TIJUANA',
    'TECATE',
    'ROSARITO',
  ];

  // Find the last occurrence of " DE {CITY}" pattern
  // We use lastIndexOf to handle edge cases where a city might be mentioned multiple times
  let truncateIndex = -1;

  for (const city of cities) {
    const pattern = ` DE ${city}`;
    const index = upper.lastIndexOf(pattern);

    if (index !== -1) {
      const candidateIndex = index + pattern.length;
      // Use the longest/rightmost match (most specific city)
      if (candidateIndex > truncateIndex) {
        truncateIndex = candidateIndex;
      }
    }
  }

  // If city found, truncate after it
  if (truncateIndex > 0) {
    return trimmed.substring(0, truncateIndex).trim();
  }

  // No city found - normalize whitespace and return
  return trimmed.replace(/\s+/g, ' ').trim();
}
