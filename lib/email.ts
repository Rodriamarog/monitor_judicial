/**
 * Email Notification Service
 *
 * Sends email alerts when monitored cases appear in bulletins
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface AlertEmailData {
  userEmail: string;
  userName?: string;
  caseNumber: string;
  juzgado: string;
  caseName?: string;
  bulletinDate: string;
  rawText: string;
  bulletinUrl?: string;
}

/**
 * Send email notification for a case match
 */
export async function sendAlertEmail(data: AlertEmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API key not configured'
    };
  }

  try {
    const { userEmail, userName, caseNumber, juzgado, caseName, bulletinDate, rawText, bulletinUrl } = data;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .alert-box {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .detail-row {
      margin: 10px 0;
    }
    .label {
      font-weight: bold;
      color: #667eea;
    }
    .case-details {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚖️ Nueva Actualización en Boletín Judicial</h1>
  </div>

  <div class="content">
    <p>Hola${userName ? ' ' + userName : ''},</p>

    <p>Se ha encontrado una actualización para uno de tus casos monitoreados:</p>

    <div class="alert-box">
      <div class="detail-row">
        <span class="label">Caso:</span> ${caseNumber}
      </div>
      ${caseName ? `<div class="detail-row"><span class="label">Nombre:</span> ${caseName}</div>` : ''}
      <div class="detail-row">
        <span class="label">Juzgado:</span> ${juzgado}
      </div>
      <div class="detail-row">
        <span class="label">Fecha del Boletín:</span> ${new Date(bulletinDate).toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>

    <h3>Detalles del Boletín:</h3>
    <div class="case-details">${rawText}</div>

    ${bulletinUrl ? `
    <div style="text-align: center;">
      <a href="${bulletinUrl}" class="button">Ver Boletín Original</a>
    </div>
    ` : ''}

    <p style="margin-top: 30px;">
      <small>
        <strong>💡 Consejo:</strong> Guarda este correo para tus registros.
        También puedes ver todas tus alertas en tu panel de control.
      </small>
    </p>
  </div>

  <div class="footer">
    <p>
      Este es un correo automático del sistema Monitor Judicial PJBC.<br>
      No respondas a este correo.
    </p>
  </div>
</body>
</html>
    `;

    const emailText = `
Monitor Judicial PJBC - Nueva Actualización

Hola${userName ? ' ' + userName : ''},

Se ha encontrado una actualización para uno de tus casos monitoreados:

Caso: ${caseNumber}
${caseName ? `Nombre: ${caseName}\n` : ''}Juzgado: ${juzgado}
Fecha del Boletín: ${bulletinDate}

Detalles:
${rawText}

${bulletinUrl ? `Ver boletín original: ${bulletinUrl}\n` : ''}
---
Monitor Judicial PJBC
    `;

    const result = await resend.emails.send({
      from: 'Monitor Judicial PJBC <onboarding@resend.dev>',
      to: userEmail,
      subject: `⚖️ Actualización: Caso ${caseNumber} - ${juzgado}`,
      html: emailHtml,
      text: emailText,
    });

    console.log('Email sent successfully:', result);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send multiple alert emails in batch
 */
export async function sendAlertEmails(alerts: AlertEmailData[]): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const alert of alerts) {
    const result = await sendAlertEmail(alert);

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${alert.caseNumber}: ${result.error}`);
      }
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
