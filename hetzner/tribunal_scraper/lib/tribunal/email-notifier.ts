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
    const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo documento en Tribunal Electronico</title>
  <style>
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .email-title { padding-top: 24px !important; padding-bottom: 20px !important; }
      .doc-text { font-size: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 0 12px;">
        <table class="email-container" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 560px; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e0e0e0;">

          <!-- Header -->
          <tr>
            <td class="email-pad" style="padding: 24px 48px 20px; border-bottom: 1px solid #f0f0f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 15px; font-weight: 600; color: #111111; letter-spacing: -0.3px;">Monitor Judicial</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #999999;">${formattedDate}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="email-pad email-title" style="padding: 28px 48px 20px;">
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #111111; letter-spacing: -0.4px;">
                Nuevo documento en Tribunal Electronico
              </h1>
              <p style="margin: 0; font-size: 14px; color: #666666;">
                Se publico un nuevo documento para uno de tus expedientes monitoreados.
              </p>
            </td>
          </tr>

          <!-- Case details -->
          <tr>
            <td class="email-pad" style="padding: 0 48px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e8e8e8; border-radius: 5px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8f8f8; border-bottom: 1px solid #e8e8e8;">
                    <span style="font-size: 11px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Detalles del expediente</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Expediente</p>
                    <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111111;">${expediente}</p>
                    <p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Juzgado</p>
                    <p style="margin: 0 0 16px; font-size: 14px; color: #333333; word-break: break-word;">${juzgado}</p>
                    <p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Fecha</p>
                    <p style="margin: 0; font-size: 14px; color: #333333;">${formattedDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Document description -->
          <tr>
            <td class="email-pad" style="padding: 0 48px 20px;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #555555; text-transform: uppercase; letter-spacing: 0.5px;">Texto del documento</p>
              <div class="doc-text" style="background-color: #f8f8f8; border-radius: 5px; padding: 14px; font-size: 13px; color: #333333; line-height: 1.7; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${descripcion}</div>
            </td>
          </tr>

          ${aiSummary ? `
          <!-- AI Summary -->
          <tr>
            <td class="email-pad" style="padding: 0 48px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e8e0; border-radius: 5px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f5faf5; border-bottom: 1px solid #e0e8e0;">
                    <span style="font-size: 11px; font-weight: 600; color: #558855; text-transform: uppercase; letter-spacing: 0.5px;">Resumen generado por IA</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.7;">${aiSummary}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td class="email-pad" style="padding: 0 48px 32px;">
              <p style="margin: 0 0 16px; font-size: 13px; color: #666666;">El PDF completo del documento esta disponible en tu panel de control.</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="https://monitorjudicial.com.mx/dashboard/alerts"
                       style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 11px 22px; border-radius: 5px;">
                      Ver en el panel de control
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-pad" style="padding: 20px 48px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 12px; color: #aaaaaa;">Monitor Judicial &mdash; Este es un mensaje automatico, no respondas a este correo.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
