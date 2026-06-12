import 'dotenv/config';
import express, { Request, Response } from 'express';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { processChatMessage } from './lib/gemini';
import { getOrCreateConversation, updateConversation, type Conversation } from './lib/whatsapp-conversation';
import { executeFunctionCalls, type FunctionResult } from './lib/whatsapp-functions';

const app = express();

// Parse URL-encoded form data (Twilio sends application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM!;
// Must match exactly what's configured in Twilio console
const WEBHOOK_URL = process.env.WEBHOOK_URL!;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  const client = twilio(accountSid, authToken);
  await client.messages.create({ from: whatsappFrom, to, body: message });
}

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const supabase = getServiceClient();

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('whatsapp_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('last_message_at', oneMinuteAgo);

  if (recentCount && recentCount > 10) {
    return { allowed: false, message: '⏳ Por favor espera un momento antes de enviar más mensajes. (Límite: 10 mensajes por minuto)' };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourlyCount } = await supabase
    .from('whatsapp_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('last_message_at', oneHourAgo);

  if (hourlyCount && hourlyCount > 100) {
    return { allowed: false, message: '⏳ Has alcanzado el límite de mensajes por hora. Por favor intenta más tarde. (Límite: 100 mensajes por hora)' };
  }

  return { allowed: true };
}

// GET /webhook — Twilio webhook verification
app.get('/webhook', (req: Request, res: Response) => {
  const challenge = req.query['hub.challenge'];
  if (challenge) return res.send(challenge);
  res.json({ status: 'WhatsApp webhook is active' });
});

// POST /webhook — Incoming WhatsApp messages
app.post('/webhook', async (req: Request, res: Response) => {
  const params = req.body as Record<string, string>;

  // Verify Twilio signature using the configured webhook URL
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) {
    return res.status(403).json({ error: 'Missing Twilio signature' });
  }

  const isValid = twilio.validateRequest(authToken, twilioSignature, WEBHOOK_URL, params);
  if (!isValid) {
    console.warn('Invalid Twilio signature from', req.ip);
    return res.status(403).json({ error: 'Invalid signature' });
  }

  const from = params['From'];
  try {
    const body = params['Body'];
    const mediaUrl = params['MediaUrl0'] ?? null;
    const mediaType = params['MediaContentType0'] ?? null;

    console.log('Incoming WhatsApp message:', { from, body: body?.slice(0, 50), mediaUrl, mediaType });

    const phone = from.replace('whatsapp:', '');

    const phoneVariants = [phone];
    if (phone.startsWith('+521') && phone.length === 14) {
      phoneVariants.push('+52' + phone.slice(4));
    } else if (phone.startsWith('+52') && !phone.startsWith('+521') && phone.length === 13) {
      phoneVariants.push('+521' + phone.slice(3));
    }

    const supabase = getServiceClient();
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('phone', phoneVariants)
      .limit(1);

    const user = users?.[0] ?? null;

    if (userError || !user) {
      console.log('User not found for phone:', phone);
      await sendWhatsAppReply(from, '❌ Tu número de teléfono no está registrado en Monitor Judicial. Por favor regístrate en la aplicación web primero: https://monitorjudicial.com.mx');
      return res.json({ status: 'user_not_found' });
    }

    if (user.subscription_tier !== 'max') {
      await sendWhatsAppReply(from, `El asistente de WhatsApp esta disponible solo para usuarios del plan Max.\n\nCon el chatbot puedes:\n- Consultar tus expedientes y clientes\n- Registrar pagos y consultar saldos\n- Agendar, reagendar y cancelar citas\n- Ver tus proximos recordatorios y eventos\n\nMejora tu plan aqui: https://monitorjudicial.com.mx/upgrade`);
      return res.json({ status: 'tier_not_eligible' });
    }

    const rateLimitCheck = await checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      await sendWhatsAppReply(from, rateLimitCheck.message!);
      return res.json({ status: 'rate_limited' });
    }

    const conversation = await getOrCreateConversation(user.id, from);

    const geminiResult = await processChatMessage({
      userId: user.id,
      userMessage: body,
      conversationHistory: conversation.messages || [],
      audioUrl: mediaUrl || undefined,
      audioType: mediaType || undefined,
      userTimezone: user.timezone || 'America/Tijuana',
    });

    let finalResponse = geminiResult.text;
    let functionResults: FunctionResult[] = [];

    if (geminiResult.functionCalls && geminiResult.functionCalls.length > 0) {
      functionResults = await executeFunctionCalls(geminiResult.functionCalls, user.id);

      const functionResponses = geminiResult.functionCalls.map((call: any, index: number) => ({
        role: 'function' as const,
        parts: [{ functionResponse: { name: call.name, response: functionResults[index] } }],
      }));

      const followUpResult = await processChatMessage({
        userId: user.id,
        userMessage: '',
        conversationHistory: [...geminiResult.updatedHistory, ...functionResponses],
      });

      finalResponse = followUpResult.text;
      geminiResult.updatedHistory = followUpResult.updatedHistory;
    }

    const hasError = functionResults.some((r) => !r.success);
    if (hasError) {
      finalResponse = functionResults.filter((r) => !r.success).map((r) => r.error).join('\n\n');
    }

    if (!finalResponse || finalResponse.trim() === '') {
      finalResponse = functionResults.length > 0
        ? functionResults.map((r) => r.message || r.error || 'Procesado').filter(Boolean).join('\n\n')
        : '✅ Procesado. Por favor intenta de nuevo con más detalles.';
    }

    await updateConversation(conversation.id, {
      messages: geminiResult.updatedHistory,
      awaiting_clarification: functionResults.some((r) => r.needs_clarification),
    });

    await sendWhatsAppReply(from, finalResponse);
    console.log('WhatsApp reply sent successfully');

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    try {
      if (from) {
        await sendWhatsAppReply(from, '❌ Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo en unos momentos.');
      }
    } catch {}
    return res.status(500).json({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'whatsapp-bot', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🤖 WhatsApp bot server running on port ${PORT}`);
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook`);
  console.log(`   Health:  GET  http://localhost:${PORT}/health`);
});
