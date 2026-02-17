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

interface CaseAlert {
  caseNumber: string;
  juzgado: string;
  caseName?: string;
  rawText: string;
  bulletinUrl?: string;
  matchedOn?: 'case_number' | 'name'; // Type of match
  monitoredName?: string; // Name that was monitored (for name matches)
}

interface BatchAlertEmailData {
  userEmail: string;
  userName?: string;
  bulletinDate: string;
  alerts: CaseAlert[];
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
    <h1>Nueva Actualización en Boletín Judicial</h1>
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
        <span class="label">Fecha del Boletín:</span> ${new Date(bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Tijuana'
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
        <strong>Nota:</strong> Guarda este correo para tus registros.
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
      from: 'Monitor Judicial <noreply@monitorjudicial.com.mx>',
      to: userEmail,
      subject: `Actualización: Caso ${caseNumber} - ${juzgado}`,
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
 * Send consolidated email with multiple case alerts for a single user
 */
export async function sendBatchAlertEmail(data: BatchAlertEmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API key not configured'
    };
  }

  try {
    const { userEmail, userName, bulletinDate, alerts } = data;
    const alertCount = alerts.length;

    const formattedBulletinDate = new Date(bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Tijuana'
    });

    const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualizaciones en Boletin Judicial</title>
  <style>
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .email-title { padding-top: 24px !important; }
      .alert-text { font-size: 12px !important; }
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
                    <span style="font-size: 12px; color: #999999;">${formattedBulletinDate}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="email-pad email-title" style="padding: 28px 48px 8px;">
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #111111; letter-spacing: -0.4px;">
                ${alertCount === 1 ? '1 nueva actualizacion' : `${alertCount} nuevas actualizaciones`} en boletin judicial
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; color: #666666;">
                Poder Judicial del Estado de Baja California
              </p>
            </td>
          </tr>

          ${alerts.map((alert, index) => `
          <!-- Alert ${index + 1} -->
          <tr>
            <td class="email-pad" style="padding: 0 48px ${index < alertCount - 1 ? '0' : '8px'};">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e8e8e8; border-radius: 5px; overflow: hidden; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8f8f8; border-bottom: 1px solid #e8e8e8;">
                    <span style="font-size: 11px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${alert.matchedOn === 'name' ? 'Coincidencia por nombre' : 'Actualizacion de expediente'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    ${alert.matchedOn === 'name' ? `
                    <p style="margin: 0 0 6px; font-size: 13px; color: #888888;">Nombre monitoreado</p>
                    <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #111111;">${alert.monitoredName || 'Desconocido'}</p>
                    <p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Expediente donde aparece</p>
                    <p style="margin: 0 0 16px; font-size: 15px; color: #111111;">${alert.caseNumber}</p>
                    ` : `
                    <p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Expediente</p>
                    <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111111;">${alert.caseNumber}</p>
                    ${alert.caseName ? `<p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Referencia</p><p style="margin: 0 0 16px; font-size: 14px; color: #333333;">${alert.caseName}</p>` : ''}
                    `}
                    <p style="margin: 0 0 4px; font-size: 13px; color: #888888;">Juzgado</p>
                    <p style="margin: 0 0 16px; font-size: 14px; color: #333333; word-break: break-word;">${alert.juzgado}</p>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #888888;">Texto del boletin</p>
                    <div class="alert-text" style="background-color: #f8f8f8; border-radius: 4px; padding: 12px; font-size: 13px; color: #333333; line-height: 1.6; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${alert.rawText}</div>
                    ${alert.bulletinUrl ? `
                    <div style="margin-top: 16px;">
                      <a href="${alert.bulletinUrl}" style="font-size: 13px; color: #111111; font-weight: 500;">Consultar boletin oficial &rarr;</a>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `).join('')}

          <!-- CTA -->
          <tr>
            <td class="email-pad" style="padding: 16px 48px 32px;">
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

    const emailText = `
MONITOR JUDICIAL PJBC
${alertCount} ${alertCount === 1 ? 'Actualización' : 'Actualizaciones'} en Boletín Judicial

Fecha: ${new Date(bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Tijuana'
    })}

Estimado${userName ? ' ' + userName : ''} usuario,

Se ${alertCount === 1 ? 'ha detectado' : 'han detectado'} ${alertCount} ${alertCount === 1 ? 'actualización' : 'actualizaciones'} en los boletines judiciales del Poder Judicial de Baja California.

${alerts.map((alert, index) => `
────────────────────────────────────────────────
CASO ${index + 1} de ${alertCount}

Número de Expediente: ${alert.caseNumber}
${alert.caseName ? `Referencia: ${alert.caseName}\n` : ''}Juzgado: ${alert.juzgado}

Detalles:
${alert.rawText}

${alert.bulletinUrl ? `Consultar boletín oficial: ${alert.bulletinUrl}\n` : ''}
`).join('\n')}

────────────────────────────────────────────────

Puede consultar el detalle completo de estas actualizaciones en su panel de control.

Este es un correo automático del sistema Monitor Judicial PJBC.
No responda a este correo.
    `;

    const result = await resend.emails.send({
      from: 'Monitor Judicial <noreply@monitorjudicial.com.mx>',
      to: userEmail,
      subject: `${alertCount === 1 ? 'Actualización' : 'Actualizaciones'} en Boletín Judicial - PJBC`,
      html: emailHtml,
      text: emailText,
    });

    console.log('Batch email sent successfully:', result);
    return { success: true };
  } catch (error) {
    console.error('Error sending batch email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send multiple alert emails in batch (DEPRECATED - use sendBatchAlertEmail for consolidated emails)
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

/**
 * Collaborator Invitation Email Data
 */
export interface CollaboratorInvitationData {
  ownerEmail: string;
  ownerName?: string;
  collaboratorEmail: string;
  invitationToken: string;
  expiresAt: string;
}

/**
 * Send collaborator invitation email
 */
export async function sendCollaboratorInvitation(
  data: CollaboratorInvitationData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API key not configured'
    };
  }

  try {
    const { ownerEmail, ownerName, collaboratorEmail, invitationToken, expiresAt } = data;

    // Format expiration date
    const expirationDate = new Date(expiresAt);
    const formattedDate = expirationDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build accept/reject URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://monitorjudicial.com.mx';
    const acceptUrl = `${baseUrl}/api/collaborators/accept?token=${invitationToken}&action=accept`;
    const rejectUrl = `${baseUrl}/api/collaborators/accept?token=${invitationToken}&action=reject`;

    const ownerDisplay = ownerName || ownerEmail;

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitacion para colaborar</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e0e0e0;">

          <!-- Header -->
          <tr>
            <td style="padding: 36px 48px 28px; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 16px; font-weight: 600; color: #111111; letter-spacing: -0.3px;">Monitor Judicial</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 48px 28px;">
              <h1 style="margin: 0 0 20px; font-size: 22px; font-weight: 600; color: #111111; letter-spacing: -0.4px;">Te han invitado a colaborar</h1>

              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #444444;">
                <strong style="color: #111111;">${ownerDisplay}</strong> te ha invitado a ser colaborador en su cuenta de Monitor Judicial.
              </p>

              <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #444444;">
                Como colaborador tendras acceso de lectura a los expedientes que te sean asignados y recibiras alertas cuando haya actualizaciones en ellos.
              </p>

              <!-- Accept button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td>
                    <a href="${acceptUrl}"
                       style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 24px; border-radius: 5px;">
                      Aceptar invitacion
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Reject link -->
              <p style="margin: 0 0 28px;">
                <a href="${rejectUrl}" style="font-size: 14px; color: #888888;">No me interesa, rechazar invitacion</a>
              </p>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #aaaaaa;">
                Esta invitacion expira el ${formattedDate}. Si no conoces a ${ownerDisplay}, ignora este mensaje.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 48px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 12px; color: #aaaaaa;">Monitor Judicial &mdash; Este es un mensaje automatico, no respondas a este correo.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
Invitación de Colaboración - Monitor Judicial

${ownerDisplay} te ha invitado a colaborar en su cuenta de Monitor Judicial.

Como colaborador, recibirás notificaciones por email cuando se detecten actualizaciones en los casos judiciales que ${ownerDisplay} te asigne.

Para aceptar esta invitación, visita:
${acceptUrl}

Para rechazar esta invitación, visita:
${rejectUrl}

Esta invitación expirará el ${formattedDate}.

¿Qué es Monitor Judicial?
Monitor Judicial es un sistema automatizado que rastrea boletines judiciales y notifica cuando aparecen casos específicos.

---
Monitor Judicial
${baseUrl}
    `;

    const result = await resend.emails.send({
      from: 'Monitor Judicial <noreply@monitorjudicial.com.mx>',
      to: collaboratorEmail,
      subject: `${ownerDisplay} te invita a colaborar en Monitor Judicial`,
      html: emailHtml,
      text: emailText,
    });

    console.log(`[Email] Collaborator invitation sent to ${collaboratorEmail}:`, result);
    return { success: true };
  } catch (error) {
    console.error('Error sending collaborator invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Collaborator Credentials Email Data
 */
export interface CollaboratorCredentialsData {
  collaboratorEmail: string;
  temporaryPassword: string;
  loginUrl: string;
}

/**
 * Send login credentials to a new collaborator account
 */
export async function sendCollaboratorCredentials(
  data: CollaboratorCredentialsData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API key not configured'
    };
  }

  try {
    const { collaboratorEmail, temporaryPassword, loginUrl } = data;

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
    .credentials-box {
      background: white;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .credentials-box p {
      margin: 12px 0;
      font-size: 14px;
    }
    .credentials-label {
      font-weight: bold;
      color: #10b981;
      display: block;
      margin-bottom: 5px;
    }
    .credentials-value {
      background: #f0f0f0;
      padding: 10px 15px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
    }
    .button-container {
      text-align: center;
      margin: 25px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #10b981;
      color: white;
      text-decoration: none;
      border-radius: 5px;
    }
    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
    .warning-box h3 {
      margin-top: 0;
      color: #92400e;
      font-size: 16px;
    }
    .warning-box ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .warning-box li {
      margin: 6px 0;
      color: #78350f;
    }
    .info-section {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
    }
    .info-section h3 {
      margin-top: 0;
      color: #059669;
      font-size: 16px;
    }
    .info-section ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .info-section li {
      margin: 6px 0;
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
    <h1>Bienvenido a Monitor Judicial</h1>
  </div>

  <div class="content">
    <p>Tu cuenta de colaborador ha sido creada exitosamente. A continuación encontrarás tus credenciales de acceso:</p>

    <div class="credentials-box">
      <p>
        <span class="credentials-label">Correo electrónico:</span>
        <div class="credentials-value">${collaboratorEmail}</div>
      </p>
      <p>
        <span class="credentials-label">Contraseña temporal:</span>
        <div class="credentials-value">${temporaryPassword}</div>
      </p>
    </div>

    <div class="button-container">
      <a href="${loginUrl}" class="button">Iniciar Sesión</a>
    </div>

    <div class="warning-box">
      <h3>Importante: Seguridad de tu cuenta</h3>
      <ul>
        <li>Cambia tu contraseña inmediatamente después de tu primer inicio de sesión</li>
        <li>Guarda estas credenciales en un lugar seguro</li>
        <li>No compartas tu contraseña con nadie</li>
      </ul>
    </div>

    <div class="info-section">
      <h3>Acceso de Colaborador</h3>
      <p>Como colaborador, tendrás acceso de solo lectura a los casos que te sean asignados:</p>
      <ul>
        <li>Ver casos asignados y sus actualizaciones</li>
        <li>Recibir alertas por correo electrónico</li>
        <li>Acceder al historial de cada caso</li>
        <li>Usar las herramientas de búsqueda y asistente legal</li>
      </ul>
    </div>

    <p style="margin-top: 25px; font-size: 14px; color: #666;">
      Si tienes alguna pregunta, contacta al administrador de la cuenta que te invitó.
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
¡Bienvenido a Monitor Judicial!

Tu cuenta de colaborador ha sido creada exitosamente.

CREDENCIALES DE ACCESO:

Email: ${collaboratorEmail}
Contraseña temporal: ${temporaryPassword}

Iniciar sesión:
${loginUrl}

IMPORTANTE - SEGURIDAD:
- Cambia tu contraseña inmediatamente después de tu primer inicio de sesión
- Guarda estas credenciales en un lugar seguro
- No compartas tu contraseña con nadie

ACCESO DE COLABORADOR:
Como colaborador, tendrás acceso de solo lectura a los casos asignados. Podrás ver casos, recibir alertas y acceder al historial, pero no podrás crear, editar o eliminar casos.

Si tienes alguna pregunta, contacta al administrador de la cuenta que te invitó.

---
Monitor Judicial
    `;

    const result = await resend.emails.send({
      from: 'Monitor Judicial <noreply@monitorjudicial.com.mx>',
      to: collaboratorEmail,
      subject: 'Bienvenido a Monitor Judicial - Credenciales de Acceso',
      html: emailHtml,
      text: emailText,
    });

    console.log(`[Email] Collaborator credentials sent to ${collaboratorEmail}:`, result);
    return { success: true };
  } catch (error) {
    console.error('Error sending collaborator credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
