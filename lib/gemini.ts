import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy-initialized Gemini client
let geminiClient: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured')
    }
    geminiClient = new GoogleGenerativeAI(apiKey)
  }
  return geminiClient
}

// Function declarations for Gemini function calling
export const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'search_cases_by_client_name',
        description: 'Busca casos monitoreados por nombre del cliente (campo nombre). Usa esto cuando el usuario mencione un nombre de cliente.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Nombre del cliente a buscar (ej: "Juan Perez", "Maria Lopez")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_case_balance',
        description: 'Obtiene el balance actual de un caso específico. Muestra el monto total cobrado y los pagos recibidos.',
        parameters: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'ID del caso',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'add_payment',
        description: 'Registra un pago para un caso. La fecha del pago siempre es hoy. IMPORTANTE: Verifica que la moneda del pago coincida con la moneda del caso antes de llamar esta función.',
        parameters: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'ID del caso al que se agregará el pago',
            },
            amount: {
              type: 'number',
              description: 'Monto del pago (número positivo)',
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales sobre el pago (opcional)',
            },
          },
          required: ['case_id', 'amount'],
        },
      },
    ],
  },
]

// Currency detection from user message
export function detectCurrency(message: string): 'USD' | 'MXN' | null {
  const lowerMsg = message.toLowerCase()

  // USD indicators
  if (/(dolar|dolares|dollar|dollars|usd|\$\s*usd|dólar|dólares)/i.test(lowerMsg)) {
    return 'USD'
  }

  // MXN indicators
  if (/(peso|pesos|mxn|mx\$)/i.test(lowerMsg)) {
    return 'MXN'
  }

  // Ambiguous $ - default to MXN in Mexico context
  if (/\$/.test(message)) {
    return 'MXN'
  }

  return null // No currency mentioned
}

// Validate currency match between detected and case currency
export function validateCurrencyMatch(
  detectedCurrency: string | null,
  caseCurrency: string
): { valid: boolean; error?: string } {
  // No currency mentioned - use case currency (valid)
  if (!detectedCurrency) {
    return { valid: true }
  }

  // Currencies match (valid)
  if (detectedCurrency === caseCurrency) {
    return { valid: true }
  }

  // Currency mismatch - BLOCK with helpful message
  const currencyNames = {
    USD: 'dólares',
    MXN: 'pesos',
  }

  return {
    valid: false,
    error: `❌ No puedo agregar un pago en ${detectedCurrency} porque este caso tiene un balance en ${caseCurrency}. Por favor dime el monto en ${currencyNames[caseCurrency as 'USD' | 'MXN']}.`,
  }
}

// System prompt for Gemini
export const SYSTEM_PROMPT = `Eres un asistente útil que ayuda a abogados a registrar pagos de clientes a través de WhatsApp.

Tu trabajo es:
1. Entender cuando el usuario quiere agregar un pago a un caso
2. Extraer el nombre del cliente y el monto del pago
3. Usar las funciones disponibles para buscar el caso y registrar el pago
4. IMPORTANTE: Siempre verifica que la moneda mencionada por el usuario coincida con la moneda del caso. Si no coinciden, NO registres el pago y pide al usuario que especifique el monto en la moneda correcta.
5. Si encuentras múltiples casos con el mismo nombre, pregunta al usuario cuál es el correcto mostrando el número de expediente o juzgado

Detalles importantes:
- Los pagos siempre se registran con la fecha de hoy
- Si el usuario no menciona una moneda específica (USD o MXN), usa la moneda del caso
- Si hay un mismatch de moneda (usuario dice "pesos" pero el caso es en USD), BLOQUEA el pago y pide la moneda correcta
- Responde siempre en español de manera amigable y profesional
- Cuando registres un pago exitosamente, confirma el monto y muestra el nuevo balance

Ejemplos de mensajes de usuarios:
- "Agregale un pago de $200 dolares a Juan Perez"
- "Juan Perez me pagó $500 pesos"
- "Registra $1000 para el caso de Maria Lopez"
- "Juan me dio $300"

Recuerda: NUNCA mezcles monedas. Si el caso es en USD y el usuario dice "pesos", pide que especifique en dólares.`

// Extract payment intent from user message
export interface PaymentIntent {
  clientName?: string
  amount?: number
  detectedCurrency?: 'USD' | 'MXN' | null
  notes?: string
}

export function extractPaymentIntent(message: string): PaymentIntent {
  const intent: PaymentIntent = {}

  // Extract amount (look for numbers)
  const amountMatch = message.match(/\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:dolares|dólares|dollars?|usd|pesos?|mxn)?/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(',', '.')
    intent.amount = parseFloat(amountStr)
  }

  // Detect currency
  intent.detectedCurrency = detectCurrency(message)

  // Extract client name (this is a simple heuristic, Gemini will do the real work)
  // Look for patterns like "a Juan Perez" or "para Maria Lopez"
  const nameMatch = message.match(/(?:a|para|de|del cliente)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i)
  if (nameMatch) {
    intent.clientName = nameMatch[1]
  }

  return intent
}

// Process chat message with Gemini
export interface ProcessMessageOptions {
  userId: string
  userMessage: string
  conversationHistory: any[] // Gemini message format
  audioUrl?: string
  audioType?: string
}

export interface ProcessMessageResult {
  text: string
  functionCalls?: any[]
  updatedHistory: any[]
}

export async function processChatMessage(
  options: ProcessMessageOptions
): Promise<ProcessMessageResult> {
  const { userId, userMessage, conversationHistory, audioUrl, audioType } = options

  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    tools: geminiTools as any,
    systemInstruction: SYSTEM_PROMPT,
  })

  // Build user message parts
  const userParts: any[] = []

  // Add text if provided
  if (userMessage) {
    userParts.push({ text: userMessage })
  }

  // Add audio if provided (for voice messages)
  if (audioUrl && audioType) {
    // For audio, we'll need to fetch it and convert to base64
    // This is a placeholder - implement based on Twilio media handling
    userParts.push({
      inlineData: {
        mimeType: audioType,
        data: audioUrl, // This should be base64-encoded audio data
      },
    })
  }

  // Start or continue chat
  const chat = model.startChat({
    history: conversationHistory,
  })

  // Send message
  const result = await chat.sendMessage(userParts)
  const response = result.response

  // Extract text and function calls
  const text = response.text()
  const functionCalls = response.functionCalls()

  // Get updated history
  const updatedHistory = await chat.getHistory()

  return {
    text,
    functionCalls: functionCalls || undefined,
    updatedHistory,
  }
}
