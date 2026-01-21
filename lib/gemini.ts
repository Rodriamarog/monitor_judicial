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
3. Buscar el caso usando search_cases_by_client_name
4. Mostrar los detalles del caso encontrado y SIEMPRE pedir confirmación explícita antes de registrar
5. SOLO después de recibir confirmación del usuario ("sí", "confirmo", "ok", etc), llamar add_payment

Flujo obligatorio:
1. Usuario pide agregar pago → Buscar caso
2. Mostrar caso encontrado y balance actual → Preguntar "¿Confirmas agregar $X [moneda]?"
3. Usuario confirma → SOLO ENTONCES llamar add_payment
4. Usuario rechaza → Cancelar operación

IMPORTANTE sobre confirmación:
- NUNCA llames add_payment sin haber recibido confirmación explícita del usuario primero
- Siempre muestra: nombre del caso, expediente, y balance actual antes de pedir confirmación
- Si el usuario dice "no" o "cancela", NO registres el pago

IMPORTANTE sobre moneda:
- Verifica que la moneda mencionada coincida con la moneda del caso
- Si no coinciden, NO registres el pago y pide la moneda correcta
- Si hay mismatch, explica claramente el problema

Formato de respuestas (WhatsApp):
- Usa *texto* (asterisco simple) para negritas, NO uses **texto**
- Ejemplo: *Caso:* JUAN PEREZ
- NO uses: **Caso:** JUAN PEREZ

Detalles adicionales:
- Los pagos siempre se registran con fecha de hoy
- Si hay múltiples casos, pide al usuario que aclare cuál
- Responde siempre en español de manera amigable y profesional

Recuerda: CONFIRMACIÓN PRIMERO, luego add_payment. NUNCA al revés.`

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
    try {
      // Fetch audio from Twilio (requires authentication)
      const twilioAuth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64')

      const audioResponse = await fetch(audioUrl, {
        headers: {
          Authorization: `Basic ${twilioAuth}`,
        },
      })

      if (audioResponse.ok) {
        const audioBuffer = await audioResponse.arrayBuffer()
        const audioBase64 = Buffer.from(audioBuffer).toString('base64')

        userParts.push({
          inlineData: {
            mimeType: audioType,
            data: audioBase64,
          },
        })
      } else {
        console.error('Failed to fetch audio from Twilio:', audioResponse.status)
        // Fallback to text if audio fetch fails
        userParts.push({ text: '[Audio message - transcription failed]' })
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      userParts.push({ text: '[Audio message - transcription failed]' })
    }
  }

  // Start or continue chat
  const chat = model.startChat({
    history: conversationHistory,
  })

  // Send message (if userParts is empty, we're continuing after function calls)
  const result = await chat.sendMessage(
    userParts.length > 0 ? userParts : ''
  )
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
