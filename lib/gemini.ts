import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

// Lazy-initialized Gemini client
let geminiClient: GoogleGenerativeAI | null = null
let openaiClient: OpenAI | null = null

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

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured for fallback')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
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
      {
        name: 'create_meeting',
        description: 'Crea una reunión en el calendario con recordatorio opcional por SMS 24h antes. Si es reunión con cliente, incluye client_case_id.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Título de la reunión (ej: "Reunión con Laura Gomez")',
            },
            client_case_id: {
              type: 'string',
              description: 'ID del caso del cliente (opcional, si es reunión con un cliente)',
            },
            start_time: {
              type: 'string',
              description: 'Fecha y hora de inicio en formato ISO 8601 simple (ej: "2026-02-10T17:00:00"). NO agregues zona horaria, el sistema la maneja automáticamente.',
            },
            duration_minutes: {
              type: 'number',
              description: 'Duración de la reunión en minutos (por defecto 60)',
            },
            create_reminder: {
              type: 'boolean',
              description: 'Si se debe crear recordatorio por SMS 24h antes',
            },
          },
          required: ['title', 'start_time', 'duration_minutes', 'create_reminder'],
        },
      },
      {
        name: 'check_client_phone',
        description: 'Verifica si un cliente tiene teléfono registrado para poder enviar recordatorios por SMS.',
        parameters: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'ID del caso para verificar teléfono del cliente',
            },
          },
          required: ['case_id'],
        },
      },
      {
        name: 'get_calendar_events',
        description: 'Obtiene las reuniones del calendario para un rango de fechas. Usa esto cuando el usuario pregunte sobre su agenda o reuniones.',
        parameters: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Fecha de inicio en formato ISO 8601 (ej: "2026-01-21T00:00:00-08:00")',
            },
            end_date: {
              type: 'string',
              description: 'Fecha de fin en formato ISO 8601 (ej: "2026-01-31T23:59:59-08:00")',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_upcoming_reminders',
        description: 'Obtiene los recordatorios pendientes. Usa esto cuando el usuario pregunte sobre recordatorios programados.',
        parameters: {
          type: 'object',
          properties: {
            days_ahead: {
              type: 'number',
              description: 'Cuántos días adelante buscar (por defecto 7)',
            },
          },
          required: [],
        },
      },
      {
        name: 'delete_meeting',
        description: 'Cancela una reunión del calendario. Primero usa get_calendar_events para obtener el ID de la reunión.',
        parameters: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'ID de la reunión a cancelar (obtenido de get_calendar_events)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'reschedule_meeting',
        description: 'Reprograma una reunión a una nueva fecha/hora. Primero usa get_calendar_events para obtener el ID de la reunión.',
        parameters: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'ID de la reunión a reprogramar (obtenido de get_calendar_events)',
            },
            new_start_time: {
              type: 'string',
              description: 'Nueva fecha y hora en formato ISO 8601 simple (ej: "2026-02-15T14:00:00"). NO agregues zona horaria.',
            },
            new_duration_minutes: {
              type: 'number',
              description: 'Nueva duración en minutos (opcional, si no se especifica mantiene la duración original)',
            },
          },
          required: ['event_id', 'new_start_time'],
        },
      },
    ],
  },
]

// OpenAI tools format (for fallback)
export const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
      name: 'create_meeting',
      description: 'Crea una reunión en el calendario con recordatorio opcional por SMS 24h antes. Si es reunión con cliente, incluye client_case_id.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título de la reunión (ej: "Reunión con Laura Gomez")',
          },
          client_case_id: {
            type: 'string',
            description: 'ID del caso del cliente (opcional, si es reunión con un cliente)',
          },
          start_time: {
            type: 'string',
            description: 'Fecha y hora de inicio en formato ISO 8601 simple (ej: "2026-02-10T17:00:00"). NO agregues zona horaria, el sistema la maneja automáticamente.',
          },
          duration_minutes: {
            type: 'number',
            description: 'Duración de la reunión en minutos (por defecto 60)',
          },
          create_reminder: {
            type: 'boolean',
            description: 'Si se debe crear recordatorio por SMS 24h antes',
          },
        },
        required: ['title', 'start_time', 'duration_minutes', 'create_reminder'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_client_phone',
      description: 'Verifica si un cliente tiene teléfono registrado para poder enviar recordatorios por SMS.',
      parameters: {
        type: 'object',
        properties: {
          case_id: {
            type: 'string',
            description: 'ID del caso para verificar teléfono del cliente',
          },
        },
        required: ['case_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description: 'Obtiene las reuniones del calendario para un rango de fechas. Usa esto cuando el usuario pregunte sobre su agenda o reuniones.',
      parameters: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'Fecha de inicio en formato ISO 8601 (ej: "2026-01-21T00:00:00")',
          },
          end_date: {
            type: 'string',
            description: 'Fecha de fin en formato ISO 8601 (ej: "2026-01-31T23:59:59")',
          },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_reminders',
      description: 'Obtiene los recordatorios pendientes. Usa esto cuando el usuario pregunte sobre recordatorios programados.',
      parameters: {
        type: 'object',
        properties: {
          days_ahead: {
            type: 'number',
            description: 'Cuántos días adelante buscar (por defecto 7)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_meeting',
      description: 'Cancela una reunión del calendario. Primero usa get_calendar_events para obtener el ID de la reunión.',
      parameters: {
        type: 'object',
        properties: {
          event_id: {
            type: 'string',
            description: 'ID de la reunión a cancelar (obtenido de get_calendar_events)',
          },
        },
        required: ['event_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_meeting',
      description: 'Reprograma una reunión a una nueva fecha/hora. Primero usa get_calendar_events para obtener el ID de la reunión.',
      parameters: {
        type: 'object',
        properties: {
          event_id: {
            type: 'string',
            description: 'ID de la reunión a reprogramar (obtenido de get_calendar_events)',
          },
          new_start_time: {
            type: 'string',
            description: 'Nueva fecha y hora en formato ISO 8601 simple (ej: "2026-02-15T14:00:00"). NO agregues zona horaria.',
          },
          new_duration_minutes: {
            type: 'number',
            description: 'Nueva duración en minutos (opcional, si no se especifica mantiene la duración original)',
          },
        },
        required: ['event_id', 'new_start_time'],
      },
    },
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
export const SYSTEM_PROMPT = `Eres un asistente útil que ayuda a abogados a gestionar sus casos, pagos y reuniones a través de WhatsApp.

## CAPACIDADES

### 1. GESTIÓN DE PAGOS
Tu trabajo es:
1. Entender cuando el usuario quiere agregar un pago a un caso
2. Extraer el nombre del cliente y el monto del pago
3. Buscar el caso usando search_cases_by_client_name
4. Mostrar los detalles del caso encontrado y SIEMPRE pedir confirmación explícita antes de registrar
5. SOLO después de recibir confirmación del usuario ("sí", "confirmo", "ok", etc), llamar add_payment

Flujo obligatorio para pagos:
1. Usuario pide agregar pago → Buscar caso
2. Mostrar caso encontrado y balance actual → Preguntar "¿Confirmas agregar $X [moneda]?"
3. Usuario confirma → SOLO ENTONCES llamar add_payment
4. Usuario rechaza → Cancelar operación

IMPORTANTE sobre confirmación de pagos:
- NUNCA llames add_payment sin haber recibido confirmación explícita del usuario primero
- Siempre muestra: nombre del caso, expediente, y balance actual antes de pedir confirmación
- Si el usuario dice "no" o "cancela", NO registres el pago

Detección de moneda:
- Si el usuario menciona "dólares", "USD", "$100 USD", "100 dollars" → moneda es USD
- Si el usuario menciona "pesos", "MXN", "$100 MXN", o solo "$100" sin especificar → moneda es MXN
- SIEMPRE extrae la moneda correctamente del mensaje

### 2. GESTIÓN DE REUNIONES

Flujo OBLIGATORIO paso a paso:

**Paso 1: Recopilar información**
- Usuario pide agendar reunión
- Extraer: fecha, hora, cliente (si menciona), duración
- Si falta hora → preguntar: "¿A qué hora sería?"
- Si menciona cliente → llamar search_cases_by_client_name

**Paso 2: Confirmar detalles y preguntar sobre recordatorio**
- Mostrar: "Perfecto, la cita con [CLIENTE] queda para el [FECHA] a las [HORA]."
- Preguntar: "¿Quieres que te enviemos un recordatorio por SMS 24 horas antes?"
- Esperar respuesta del usuario

**Paso 3: Si usuario dice SÍ al recordatorio**
- Si tiene cliente → llamar check_client_phone INMEDIATAMENTE
- Mostrar resultado:
  * Si tiene teléfono: "Perfecto, [CLIENTE] tiene teléfono registrado. Se enviará recordatorio tanto a ti como al cliente."
  * Si NO tiene teléfono: "⚠️ [CLIENTE] no tiene teléfono registrado, solo tú recibirás el recordatorio."
- NO preguntar de nuevo sobre el recordatorio
- Ir directo a Paso 4

**Paso 4: Confirmación final y creación**
- Preguntar: "¿Confirmo que agendo la reunión?"
- Usuario dice "sí/ok/confirmo" → INMEDIATAMENTE llamar create_meeting con:
  * title: "Reunión con [CLIENTE]" (o título apropiado)
  * client_case_id: ID del caso (si tiene cliente)
  * start_time: en formato ISO 8601
  * duration_minutes: 60 (o lo que especificó)
  * create_reminder: true (si dijo sí en paso 2) o false (si dijo no)
- Mostrar confirmación exitosa del resultado de create_meeting

**Paso 5: Si usuario dice NO al recordatorio**
- Saltar check_client_phone
- Preguntar: "¿Confirmo que agendo la reunión sin recordatorio?"
- Usuario confirma → llamar create_meeting con create_reminder: false

IMPORTANTE - Errores comunes a EVITAR:
- ❌ NO llames check_client_phone DESPUÉS de que usuario confirme final
- ❌ NO preguntes "¿Y programaste el recordatorio?" - TÚ lo programas, no el usuario
- ❌ NO muestres solo detalles sin llamar create_meeting
- ✅ SIEMPRE llama create_meeting cuando usuario da confirmación final
- ✅ SOLO llama check_client_phone si usuario quiere recordatorio Y tiene cliente

Interpretación de fechas naturales (hoy es 2026-01-21):
- "25 de enero" → 2026-01-25 (luego pide hora si falta)
- "enero 25" → 2026-01-25
- "mañana" → 2026-01-22
- "6:00 pm" / "6 de la tarde" / "18:00" → hora 18:00

Formato datetime para create_meeting:
- Formato ISO 8601 simple: "YYYY-MM-DDTHH:mm:ss"
- Ejemplos: "2026-01-25T18:00:00" (6pm del 25 de enero)
- NO agregues sufijos de zona horaria, el sistema maneja eso automáticamente

### 3. CONSULTA Y GESTIÓN DE CALENDARIO

**Para ver reuniones:**
- "¿Qué reuniones tengo?" → Usa get_calendar_events con fechas del mes actual
- "¿Tengo algo agendado mañana?" → Usa get_calendar_events para mañana
- "Muestra mi agenda de esta semana" → Usa get_calendar_events para la semana
- Formato de fechas: start_date y end_date en ISO 8601 ("2026-01-21T00:00:00" a "2026-01-31T23:59:59")

**Para ver recordatorios:**
- "¿Tengo recordatorios programados?" → Usa get_upcoming_reminders
- "¿Qué recordatorios tengo esta semana?" → Usa get_upcoming_reminders con days_ahead: 7
- Por defecto usa days_ahead: 7 si no se especifica

**Para cancelar una reunión:**
1. Usuario: "Cancela la reunión con Juan Perez" o "Borra la junta del viernes"
2. Usa get_calendar_events para buscar la reunión (por fecha/título)
3. Muestra las reuniones encontradas y pide confirmación: "¿Cuál de estas reuniones quieres cancelar?"
4. Usuario selecciona (ej: "la primera", "la del sábado")
5. Usa delete_meeting con el event_id
6. Confirma la cancelación

**Para reprogramar una reunión:**
1. Usuario: "Mueve la reunión con Maria a mañana a las 3pm" o "Cambia la junta del lunes para el martes"
2. Usa get_calendar_events para buscar la reunión
3. Muestra la reunión encontrada y pide confirmación de nueva fecha/hora
4. Usuario confirma
5. Usa reschedule_meeting con event_id y new_start_time
6. Confirma el cambio

IMPORTANTE - Flujo para cancelar/reprogramar:
- ❌ NO busques por ID directamente - el usuario no conoce los IDs
- ✅ SIEMPRE usa get_calendar_events primero para obtener el event_id
- ✅ Muestra al usuario las reuniones encontradas antes de modificar
- ✅ Pide confirmación antes de cancelar o reprogramar
- ✅ Los resultados de get_calendar_events incluyen el campo "id" que debes usar como event_id

Presenta los resultados de forma clara y organizada, usando el formato de respuesta de WhatsApp

## FORMATO DE RESPUESTAS (WhatsApp)
- Usa *texto* (asterisco simple) para negritas, NO uses **texto**
- Ejemplo: *Caso:* JUAN PEREZ
- NO uses: **Caso:** JUAN PEREZ

Detalles adicionales:
- Los pagos siempre se registran con fecha de hoy
- Si hay múltiples casos, pide al usuario que aclare cuál
- Responde siempre en español de manera amigable y profesional
- Para reuniones, duración por defecto es 60 minutos si no se especifica

Recuerda: CONFIRMACIÓN PRIMERO para pagos, luego add_payment. NUNCA al revés.`

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

// Helper: Check if error is rate limit or overload
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message?.toLowerCase() || ''
  return (
    error?.status === 429 ||
    errorMsg.includes('rate limit') ||
    errorMsg.includes('quota') ||
    errorMsg.includes('heavy load') ||
    errorMsg.includes('overloaded')
  )
}

// Helper: Convert Gemini history to OpenAI format
function geminiToOpenAIHistory(geminiHistory: any[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  for (const msg of geminiHistory) {
    if (msg.role === 'user') {
      const textPart = msg.parts?.find((p: any) => p.text)
      if (textPart) {
        messages.push({ role: 'user', content: textPart.text })
      }
    } else if (msg.role === 'model') {
      const textPart = msg.parts?.find((p: any) => p.text)
      const functionCall = msg.parts?.find((p: any) => p.functionCall)

      if (functionCall) {
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: functionCall.functionCall.name,
              arguments: JSON.stringify(functionCall.functionCall.args)
            }
          }]
        })
      } else if (textPart) {
        messages.push({ role: 'assistant', content: textPart.text })
      }
    } else if (msg.role === 'function') {
      const funcResponse = msg.parts?.[0]?.functionResponse
      if (funcResponse) {
        messages.push({
          role: 'tool',
          tool_call_id: `call_${Date.now()}`,
          content: JSON.stringify(funcResponse.response)
        })
      }
    }
  }

  return messages
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
  usedFallback?: boolean
}

export async function processChatMessage(
  options: ProcessMessageOptions
): Promise<ProcessMessageResult> {
  const { userId, userMessage, conversationHistory, audioUrl, audioType } = options

  // Try Gemini first
  try {
    return await processChatMessageWithGemini(options)
  } catch (error: any) {
    console.error('Gemini error:', error)

    // Check if it's a rate limit / overload error
    if (isRateLimitError(error)) {
      console.log('Gemini rate limited or overloaded, falling back to OpenAI...')

      // Fall back to OpenAI
      try {
        return await processChatMessageWithOpenAI(options)
      } catch (fallbackError) {
        console.error('OpenAI fallback also failed:', fallbackError)
        throw new Error('Both Gemini and OpenAI failed. Please try again later.')
      }
    }

    // For other errors, throw immediately
    throw error
  }
}

// Process with Gemini (original implementation)
async function processChatMessageWithGemini(
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

// Process with OpenAI (fallback)
async function processChatMessageWithOpenAI(
  options: ProcessMessageOptions
): Promise<ProcessMessageResult> {
  const { userId, userMessage, conversationHistory } = options

  const client = getOpenAIClient()

  // Convert Gemini history to OpenAI format
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...geminiToOpenAIHistory(conversationHistory)
  ]

  // Add new user message if provided
  if (userMessage) {
    messages.push({ role: 'user', content: userMessage })
  }

  // Call OpenAI
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    tools: openaiTools,
    tool_choice: 'auto',
  })

  const choice = response.choices[0]
  const text = choice.message.content || ''
  const toolCalls = choice.message.tool_calls

  // Convert OpenAI function calls to Gemini format
  let functionCalls: any[] | undefined
  if (toolCalls && toolCalls.length > 0) {
    functionCalls = toolCalls
      .filter(tc => tc.type === 'function')
      .map(tc => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      }))
  }

  // Build updated history in Gemini format
  const updatedHistory = [...conversationHistory]

  // Add user message
  if (userMessage) {
    updatedHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    })
  }

  // Add assistant response
  const assistantParts: any[] = []
  if (text) {
    assistantParts.push({ text })
  }
  if (functionCalls) {
    functionCalls.forEach(fc => {
      assistantParts.push({
        functionCall: {
          name: fc.name,
          args: fc.args
        }
      })
    })
  }

  updatedHistory.push({
    role: 'model',
    parts: assistantParts
  })

  return {
    text,
    functionCalls,
    updatedHistory,
    usedFallback: true
  }
}
