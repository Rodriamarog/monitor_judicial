/**
 * Tribunal Electrónico Email Notifier
 * Sends email alerts for new tribunal documents
 */

import { Resend } from 'resend';
import { SupabaseClient } from '@supabase/supabase-js';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailNotifyParams {
  userId: string;
  expediente: string;
  juzgado: string;
  descripcion: string;
  fecha: string;
  aiSummary?: string;
  supabase: SupabaseClient;
}

export interface EmailNotifyResult {
  success: boolean;
  error?: string;
  status?: string;
}

/**
 * Send email alert for a tribunal document
 */
export async function sendTribunalEmailAlert(
  params: EmailNotifyParams
): Promise<EmailNotifyResult> {
  const {
    userId,
    expediente,
    juzgado,
    descripcion,
    fecha,
    aiSummary,
    supabase
  } = params;

  try {
    if (!resend) {
      console.log(`[Email] Resend not configured, skipping email notification`);
      return {
        success: false,
        error: 'Resend API key not configured',
        status: 'not_configured'
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email, full_name, email_notifications_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.log(`[Email] User ${userId} has no profile, skipping notification`);
      return {
        success: false,
        error: 'Usuario sin perfil',
        status: 'no_profile'
      };
    }

    // Check if email notifications are enabled
    if (profile.email_notifications_enabled === false) {
      console.log(`[Email] User ${userId} has email notifications disabled, skipping`);
      return {
        success: false,
        error: 'Email notifications disabled',
        status: 'disabled'
      };
    }

    // Check if user has email
    if (!profile.email) {
      console.log(`[Email] User ${userId} has no email address, skipping notification`);
      return {
        success: false,
        error: 'Sin correo electrónico',
        status: 'no_email'
      };
    }

    // Format date nicely
    const formattedDate = new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Tijuana'
    });

    // Build email HTML
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
      border-left: 4px solid #10b981;
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
      color: #10b981;
    }
    .case-details {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      font-size: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .ai-summary {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #10b981;
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
    <h1>Nuevo Documento en Tribunal Electrónico</h1>
  </div>

  <div class="content">
    <p>Se ha encontrado un nuevo documento en <strong>Tribunal Electrónico PJBC</strong> para uno de tus casos monitoreados:</p>

    <div class="alert-box">
      <div class="detail-row">
        <span class="label">Expediente:</span> ${expediente}
      </div>
      <div class="detail-row">
        <span class="label">Juzgado:</span> ${juzgado}
      </div>
      <div class="detail-row">
        <span class="label">Fecha:</span> ${formattedDate}
      </div>
    </div>

    <h3>Descripción del Documento:</h3>
    <div class="case-details">${descripcion}</div>

    ${aiSummary ? `
    <h3>Resumen Generado por IA:</h3>
    <div class="ai-summary">${aiSummary}</div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_VERCEL_URL || 'https://monitor-judicial.vercel.app'}/dashboard/alerts" class="button">
        Ver en Dashboard
      </a>
    </div>

    <p style="margin-top: 30px;">
      <small>
        <strong>Nota:</strong> El PDF completo del documento está disponible en tu panel de control.
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

    // Build plain text version
    const emailText = `
Monitor Judicial PJBC - Nuevo Documento en Tribunal Electrónico

Se ha encontrado un nuevo documento en Tribunal Electrónico PJBC para uno de tus casos monitoreados:

Expediente: ${expediente}
Juzgado: ${juzgado}
Fecha: ${formattedDate}

Descripción:
${descripcion}

${aiSummary ? `Resumen (IA):\n${aiSummary}\n\n` : ''}
Ver detalles completos: ${process.env.NEXT_PUBLIC_VERCEL_URL || 'https://monitor-judicial.vercel.app'}/dashboard/alerts

---
Monitor Judicial PJBC
Este es un correo automático. No respondas a este mensaje.
    `;

    // Send email
    // Using same verified domain as production boletin judicial emails
    await resend.emails.send({
      from: 'Monitor Judicial <noreply@monitorjudicial.com.mx>',
      to: profile.email,
      subject: `Nuevo documento en caso ${expediente}`,
      html: emailHtml,
      text: emailText,
    });

    console.log(`[Email] ✓ Email sent to ${profile.email} for expediente ${expediente}`);
    return {
      success: true,
      status: 'sent'
    };

  } catch (error) {
    console.error('[Email] Error:', {
      message: error instanceof Error ? error.message : 'Unknown',
      userId,
      expediente,
      juzgado,
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      status: 'error'
    };
  }
}
