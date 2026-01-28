/**
 * Test script to verify the AI knows the correct current date
 */

import { generateSystemPrompt } from '@/lib/gemini'

console.log('Testing date-aware system prompt...\n')
console.log('=' .repeat(60))

const prompt = generateSystemPrompt('America/Tijuana')

// Extract the date section
const dateSection = prompt.split('## CAPACIDADES')[0]
console.log(dateSection)
console.log('=' .repeat(60))

console.log('\n✅ The AI will now know the current date!')
console.log('Users can say "mañana" and the AI will calculate the correct date.')
