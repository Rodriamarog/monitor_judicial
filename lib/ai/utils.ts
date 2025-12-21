/**
 * AI Flow Utilities
 * Helper functions for token estimation and performance tracking
 */

/**
 * Estimate tokens from text
 * Rule of thumb: 1 token ≈ 4 characters in Spanish
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Create a performance timer
 */
export function createTimer() {
  const start = Date.now()

  return {
    elapsed: () => Date.now() - start,
    log: (label: string) => {
      const elapsed = Date.now() - start
      console.log(`[Timer] ${label}: ${elapsed}ms`)
    }
  }
}

/**
 * Truncate text for logging
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
