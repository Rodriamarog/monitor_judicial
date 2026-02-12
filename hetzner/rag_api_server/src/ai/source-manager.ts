/**
 * AI Flow Source Manager
 * Deduplication and management of tesis sources across conversation
 */

import { TesisSource } from './agent-state'
import { DatabaseMessage } from './types'

/**
 * Deduplicate sources by id_tesis
 * Keeps the first occurrence of each unique source
 */
export function deduplicateSources(sources: TesisSource[]): TesisSource[] {
  const seen = new Set<number>()
  return sources.filter(source => {
    if (seen.has(source.id_tesis)) {
      return false
    }
    seen.add(source.id_tesis)
    return true
  })
}

/**
 * Extract sources from conversation history
 * Returns up to maxSources unique sources
 */
export function extractSourcesFromHistory(
  messages: DatabaseMessage[],
  maxSources: number = 15
): TesisSource[] {
  const allSources: TesisSource[] = []

  // Collect all sources from assistant messages
  for (const message of messages) {
    if (message.role === 'assistant' && message.sources) {
      allSources.push(...message.sources)
    }
  }

  // Deduplicate and limit
  const uniqueSources = deduplicateSources(allSources)
  return uniqueSources.slice(-maxSources)
}

/**
 * Merge new sources with historical sources
 * Prioritizes new sources, then historical
 * Returns up to maxSources unique sources
 */
export function mergeSources(
  newSources: TesisSource[],
  historicalSources: TesisSource[],
  maxSources: number = 15
): TesisSource[] {
  // Combine: new sources first, then historical
  const combined = [...newSources, ...historicalSources]

  // Deduplicate
  const unique = deduplicateSources(combined)

  // Limit to maxSources, keeping most recent
  return unique.slice(-maxSources)
}
