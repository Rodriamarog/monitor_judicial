/**
 * Normalize expediente number to consistent format
 * Strips "EXPEDIENTE " prefix and pads first part to 5 digits
 *
 * Examples:
 *   "EXPEDIENTE 1234/2025" → "01234/2025"
 *   "1234/2025" → "01234/2025"
 *   "  123/24-CV  " → "00123/24-CV"
 *   "77/2026" → "00077/2026"
 */
export function normalizeExpediente(expediente: string): string {
  let trimmed = expediente.trim().toUpperCase();

  // Strip "EXPEDIENTE " prefix if present
  trimmed = trimmed.replace(/^EXPEDIENTE\s+/, '');

  // Pattern: digits / digits + optional suffix like -CV, -MP
  const match = trimmed.match(/^(\d+)\/(\d+)(-[A-Z]+)?$/);

  if (!match) {
    // Can't parse - return as-is
    console.warn(`Could not normalize expediente: ${expediente}`);
    return trimmed;
  }

  const [_, firstPart, secondPart, suffix = ''] = match;

  // Pad first part to 5 digits
  const paddedFirst = firstPart.padStart(5, '0');

  return `${paddedFirst}/${secondPart}${suffix}`;
}
