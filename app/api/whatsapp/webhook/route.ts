import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'
import { processChatMessage, detectCurrency, validateCurrencyMatch } from '@/lib/gemini'
import {
  getOrCreateConversation,
  updateConversation,
  type Conversation,
} from '@/lib/whatsapp-conversation'
import { executeFunctionCalls, type FunctionResult } from '@/lib/whatsapp-functions'

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM

// Supabase service client (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Initialize Twilio client
function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }
  return twilio(accountSid, authToken)
}

// Send WhatsApp reply
async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  const client = getTwilioClient()

  if (!whatsappFrom) {
    throw new Error('TWILIO_WHATSAPP_FROM not configured')
  }

  await client.messages.create({
    from: whatsappFrom,
    to: to,
    body: message,
  })
}

// Check rate limiting
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const supabase = getServiceClient()

  // Check messages in last minute (burst protection)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { count: recentCount, error: recentError } = await supabase
    .from('whatsapp_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('last_message_at', oneMinuteAgo)

  if (recentError) {
    console.error('Rate limit check error:', recentError)
  }

  if (recentCount && recentCount > 10) {
    return {
      allowed: false,
      message: '⏳ Por favor espera un momento antes de enviar más mensajes. (Límite: 10 mensajes por minuto)',
    }
  }

  // Check messages in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: hourlyCount, error: hourlyError } = await supabase
    .from('whatsapp_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('last_message_at', oneHourAgo)

  if (hourlyError) {
    console.error('Hourly rate limit check error:', hourlyError)
  }

  if (hourlyCount && hourlyCount > 100) {
    return {
      allowed: false,
      message: '⏳ Has alcanzado el límite de mensajes por hora. Por favor intenta más tarde. (Límite: 100 mensajes por hora)',
    }
  }

  return { allowed: true }
}

// GET handler - Twilio webhook validation
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('hub.challenge')

  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ status: 'WhatsApp webhook is active' })
}

// POST handler - Incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()
    const from = formData.get('From') as string // whatsapp:+52...
    const body = formData.get('Body') as string // Text message
    const mediaUrl = formData.get('MediaUrl0') as string | null // Audio URL for voice messages
    const mediaType = formData.get('MediaContentType0') as string | null

    console.log('Incoming WhatsApp message:', { from, body, mediaUrl, mediaType })

    // Verify Twilio signature (optional but recommended for production)
    // const twilioSignature = request.headers.get('x-twilio-signature')
    // if (twilioSignature) {
    //   const isValid = twilio.validateRequest(
    //     authToken!,
    //     twilioSignature,
    //     request.url,
    //     Object.fromEntries(formData)
    //   )
    //   if (!isValid) {
    //     return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    //   }
    // }

    // Extract phone number (remove whatsapp: prefix)
    const phone = from.replace('whatsapp:', '')

    // Look up user by phone
    const supabase = getServiceClient()
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone', phone)
      .single()

    if (userError || !user) {
      console.log('User not found for phone:', phone)
      await sendWhatsAppReply(
        from,
        '❌ Tu número de teléfono no está registrado en Monitor Judicial. Por favor regístrate en la aplicación web primero: https://monitor-judicial.vercel.app'
      )
      return NextResponse.json({ status: 'user_not_found' })
    }

    // Check tier eligibility (pro500+)
    const eligibleTiers = ['pro500', 'pro1000']
    if (!eligibleTiers.includes(user.subscription_tier)) {
      console.log('User not eligible (tier):', user.subscription_tier)
      await sendWhatsAppReply(
        from,
        '⚠️ Esta función está disponible solo para usuarios Pro 500+. Actualiza tu suscripción en https://monitor-judicial.vercel.app/dashboard/settings'
      )
      return NextResponse.json({ status: 'tier_not_eligible' })
    }

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(user.id)
    if (!rateLimitCheck.allowed) {
      await sendWhatsAppReply(from, rateLimitCheck.message!)
      return NextResponse.json({ status: 'rate_limited' })
    }

    // Load or create conversation
    const conversation = await getOrCreateConversation(user.id, from)

    // Process message with Gemini
    const geminiResult = await processChatMessage({
      userId: user.id,
      userMessage: body,
      conversationHistory: conversation.messages || [],
      audioUrl: mediaUrl || undefined,
      audioType: mediaType || undefined,
    })

    console.log('Gemini result:', {
      text: geminiResult.text,
      hasFunctionCalls: !!geminiResult.functionCalls,
    })

    // Execute function calls if any
    let finalResponse = geminiResult.text
    let functionResults: FunctionResult[] = []

    if (geminiResult.functionCalls && geminiResult.functionCalls.length > 0) {
      console.log('Executing function calls:', geminiResult.functionCalls)
      functionResults = await executeFunctionCalls(geminiResult.functionCalls, user.id)

      console.log('Function results:', JSON.stringify(functionResults, null, 2))

      // Build function responses for Gemini
      const functionResponses = geminiResult.functionCalls.map((call: any, index: number) => ({
        role: 'function' as const,
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: functionResults[index],
            },
          },
        ],
      }))

      // Continue conversation with function results
      const followUpResult = await processChatMessage({
        userId: user.id,
        userMessage: '', // No new user message, just function results
        conversationHistory: [...geminiResult.updatedHistory, ...functionResponses],
      })

      console.log('Follow-up result:', { text: followUpResult.text, hasText: !!followUpResult.text })

      finalResponse = followUpResult.text
      geminiResult.updatedHistory = followUpResult.updatedHistory
    }

    // Check for currency mismatch errors in function results
    const hasError = functionResults.some((r) => !r.success)
    if (hasError) {
      const errorMessages = functionResults.filter((r) => !r.success).map((r) => r.error)
      finalResponse = errorMessages.join('\n\n')
    }

    // Fallback if no response generated
    if (!finalResponse || finalResponse.trim() === '') {
      // Use function result messages as fallback
      if (functionResults.length > 0) {
        finalResponse = functionResults
          .map((r) => r.message || r.error || 'Procesado')
          .filter(Boolean)
          .join('\n\n')
      }

      // If still empty, use generic message
      if (!finalResponse || finalResponse.trim() === '') {
        finalResponse = '✅ Procesado. Por favor intenta de nuevo con más detalles.'
      }
    }

    // Update conversation state
    await updateConversation(conversation.id, {
      messages: geminiResult.updatedHistory,
      awaiting_clarification: functionResults.some((r) => r.needs_clarification),
    })

    // Send reply
    await sendWhatsAppReply(from, finalResponse)

    console.log('WhatsApp reply sent successfully')

    return NextResponse.json({
      status: 'success',
      message: 'Message processed',
    })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)

    // Try to send error message to user
    try {
      const formData = await request.clone().formData()
      const from = formData.get('From') as string
      if (from) {
        await sendWhatsAppReply(
          from,
          '❌ Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo en unos momentos.'
        )
      }
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError)
    }

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
