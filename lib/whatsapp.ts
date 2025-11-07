/**
 * WhatsApp Notification Service using Twilio
 * Sends case alert notifications via WhatsApp
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const alertTemplateContentSid = process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID;

// Initialize Twilio client (lazy initialization)
let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

interface WhatsAppAlertData {
  to: string; // Recipient's WhatsApp number (format: whatsapp:+5216641234567)
  userName?: string;
  bulletinDate: string;
  alerts: Array<{
    caseNumber: string;
    juzgado: string;
    caseName?: string | null;
    rawText: string;
  }>;
}

/**
 * Send a consolidated WhatsApp alert with multiple cases
 * Uses WhatsApp template: notificacion_de_compra_2 (UTILITY)
 * ContentSid: HXd2473dd12164260d0b5f52aeccc29c7a
 * Template: "Hay una nueva actualización en tu {{1}}
 *
 *            por {{2}}
 *
 *            en {{3}}
 *
 *            el {{4}}.
 *
 *            Puedes revisar la actualización en tu dashboard en la seccion de 'Alertas'."
 */
export async function sendWhatsAppAlert(
  data: WhatsAppAlertData
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    if (!whatsappFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM not configured');
    }

    if (!alertTemplateContentSid) {
      throw new Error('TWILIO_WHATSAPP_ALERT_TEMPLATE_SID not configured');
    }

    const client = getTwilioClient();

    // Format bulletin date (add T12:00:00 to avoid timezone issues)
    const formattedDate = new Date(data.bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Tijuana',
    });

    // Send one message per alert using the template
    const results = [];
    for (const alert of data.alerts) {
      // Extract location from juzgado name (e.g., "JUZGADO PRIMERO CIVIL TIJUANA" -> "Tijuana")
      const location = extractLocation(alert.juzgado);

      const response = await client.messages.create({
        from: whatsappFrom,
        to: data.to,
        contentSid: alertTemplateContentSid,
        contentVariables: JSON.stringify({
          '1': `caso ${alert.caseNumber}`,
          '2': alert.juzgado,
          '3': location,
          '4': formattedDate,
        }),
      });

      console.log(`WhatsApp sent successfully to ${data.to}, SID: ${response.sid}`);
      results.push(response.sid);
    }

    return {
      success: true,
      messageId: results.join(', '),
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract location from juzgado name
 */
function extractLocation(juzgado: string): string {
  const upperJuzgado = juzgado.toUpperCase();
  if (upperJuzgado.includes('TIJUANA')) return 'Tijuana';
  if (upperJuzgado.includes('MEXICALI')) return 'Mexicali';
  if (upperJuzgado.includes('ENSENADA')) return 'Ensenada';
  if (upperJuzgado.includes('TECATE')) return 'Tecate';
  if (upperJuzgado.includes('PLAYAS DE ROSARITO')) return 'Playas de Rosarito';
  return 'Baja California';
}

/**
 * Format WhatsApp message content
 */
function formatWhatsAppMessage(data: WhatsAppAlertData): string {
  const { userName, bulletinDate, alerts } = data;
  const alertCount = alerts.length;

  // Format date nicely (add T12:00:00 to avoid timezone issues)
  const formattedDate = new Date(bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Tijuana',
  });

  // Header
  let message = `🔔 *Monitor Judicial - ${alertCount === 1 ? 'Nueva Alerta' : 'Nuevas Alertas'}*\n\n`;

  if (userName) {
    message += `Hola ${userName},\n\n`;
  }

  message += `${alertCount === 1 ? 'Se encontró' : 'Se encontraron'} *${alertCount}* ${alertCount === 1 ? 'caso' : 'casos'} en el boletín del *${formattedDate}*.\n\n`;

  // Add each case
  alerts.forEach((alert, index) => {
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*Caso ${index + 1} de ${alertCount}*\n\n`;
    message += `📋 *Expediente:* ${alert.caseNumber}\n`;

    if (alert.caseName) {
      message += `📝 *Referencia:* ${alert.caseName}\n`;
    }

    message += `⚖️ *Juzgado:* ${alert.juzgado}\n\n`;

    // Truncate raw text to avoid very long messages
    const truncatedText = alert.rawText.length > 200
      ? alert.rawText.substring(0, 200) + '...'
      : alert.rawText;
    message += `${truncatedText}\n\n`;
  });

  // Footer
  message += `━━━━━━━━━━━━━━━━\n\n`;
  message += `📱 *Ver detalles completos:*\n`;
  message += `${process.env.NEXT_PUBLIC_VERCEL_URL || 'https://monitor-judicial.vercel.app'}/dashboard/alerts\n\n`;
  message += `_Monitor Judicial PJBC_`;

  return message;
}

/**
 * Send opt-in message to new user
 */
export async function sendOptInMessage(
  to: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!whatsappFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM not configured');
    }

    const client = getTwilioClient();

    const message = `¡Bienvenido${userName ? (' ' + userName) : ''} a Monitor Judicial! 👋\n\n` +
      `Recibirás notificaciones por WhatsApp cuando tus casos aparezcan en los boletines del PJBC.\n\n` +
      `Para confirmar, responde: *SI*\n\n` +
      `Para cancelar notificaciones, responde: *STOP*`;

    await client.messages.create({
      from: whatsappFrom,
      to: to,
      body: message,
    });

    return { success: true };
  } catch (error) {
    console.error('Opt-in message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate WhatsApp number format
 */
export function validateWhatsAppNumber(number: string): boolean {
  // Must start with 'whatsapp:+' followed by country code and number
  // Example: whatsapp:+5216641234567
  const whatsappRegex = /^whatsapp:\+[1-9]\d{1,14}$/;
  return whatsappRegex.test(number);
}

/**
 * Format phone number to WhatsApp format
 * Input: +5216641234567 or 6641234567
 * Output: whatsapp:+5216641234567
 */
export function formatToWhatsApp(phoneNumber: string): string {
  // Remove any existing 'whatsapp:' prefix
  let cleaned = phoneNumber.replace(/^whatsapp:/, '');

  // Add + if not present
  if (!cleaned.startsWith('+')) {
    // Assume Mexico country code if no + present
    cleaned = '+52' + cleaned;
  }

  return 'whatsapp:' + cleaned;
}
