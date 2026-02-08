import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { tool } from 'ai'
import { z } from 'zod'

const testTool = tool({
  description: 'Test tool',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    console.log('[Test Tool] Executed with:', query)
    return { result: 'test result for: ' + query }
  },
})

async function test() {
  console.log('[Test] Starting generateText with tools...')

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    tools: { testTool },
    prompt: 'Use the testTool with query "hello world"',
  })

  console.log('[Test] Result keys:', Object.keys(result))
  console.log('[Test] Full result:', JSON.stringify(result, null, 2))
}

test().catch(console.error)
