/**
 * Test utility for WhatsApp webhook
 *
 * This script simulates Twilio webhook payloads to test the WhatsApp payment agent
 *
 * Usage:
 *   npx tsx scripts/test-whatsapp-webhook.ts
 *
 * Make sure to set GOOGLE_GEMINI_API_KEY in .env.local before running
 */

import { processChatMessage } from '../lib/gemini'
import { executeFunctionCalls } from '../lib/whatsapp-functions'

// Test user ID (replace with actual user ID from your database)
const TEST_USER_ID = 'test-user-id'

// Test scenarios
const scenarios = [
  {
    name: 'Single case match - add payment',
    message: 'Agregale un pago de $200 dolares a Juan Perez',
  },
  {
    name: 'Multiple case matches - disambiguation',
    message: 'Registra $500 pesos para Maria Lopez',
  },
  {
    name: 'No cases found',
    message: 'Agregale un pago de $100 a Pedro Gonzalez',
  },
  {
    name: 'Currency detection - USD',
    message: 'Juan me pagó 300 dólares',
  },
  {
    name: 'Currency detection - MXN',
    message: 'Maria me dio 500 pesos',
  },
  {
    name: 'Ambiguous amount',
    message: 'Agregale un pago de $1000 a Carlos Rodriguez',
  },
]

async function runTest(scenario: typeof scenarios[0]) {
  console.log('\n' + '='.repeat(80))
  console.log(`Testing: ${scenario.name}`)
  console.log('='.repeat(80))
  console.log(`User message: "${scenario.message}"\n`)

  try {
    // Process with Gemini
    const result = await processChatMessage({
      userId: TEST_USER_ID,
      userMessage: scenario.message,
      conversationHistory: [],
    })

    console.log('Gemini response:', result.text)

    // Execute function calls if any
    if (result.functionCalls && result.functionCalls.length > 0) {
      console.log('\nFunction calls detected:')
      result.functionCalls.forEach((call: any) => {
        console.log(`  - ${call.name}(${JSON.stringify(call.args)})`)
      })

      const functionResults = await executeFunctionCalls(result.functionCalls, TEST_USER_ID)

      console.log('\nFunction results:')
      functionResults.forEach((res, i) => {
        console.log(`  ${i + 1}. ${res.success ? '✅' : '❌'} ${res.message || res.error}`)
      })
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function main() {
  console.log('WhatsApp Webhook Test Utility')
  console.log('==============================\n')

  console.log('⚠️  NOTE: This test requires:')
  console.log('  1. GOOGLE_GEMINI_API_KEY environment variable')
  console.log('  2. Valid Supabase credentials')
  console.log('  3. Test user with cases in the database\n')

  // Check for Gemini API key
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error('❌ GOOGLE_GEMINI_API_KEY not found in environment')
    console.error('   Add it to .env.local and try again\n')
    process.exit(1)
  }

  console.log('✅ Environment configured\n')
  console.log('Starting tests...\n')

  // Run all scenarios
  for (const scenario of scenarios) {
    await runTest(scenario)
    // Wait a bit between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log('\n' + '='.repeat(80))
  console.log('All tests completed')
  console.log('='.repeat(80))
}

// Run tests
main().catch(console.error)
