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
      background: #1e293b;
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .badge {
      background: rgba(255,255,255,0.15);
      padding: 5px 15px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 10px;
      font-size: 14px;
    }
    .content {
      background: #f8fafc;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .alert-box {
      background: white;
      border-left: 4px solid #475569;
      padding: 20px;
      margin: 15px 0;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .case-header {
      font-weight: 600;
      color: #334155;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .detail-row {
      margin: 8px 0;
      font-size: 14px;
    }
    .label {
      font-weight: 600;
      color: #555;
    }
    .case-details {
      background: #f0f0f0;
      padding: 12px;
      border-radius: 4px;
      margin: 10px 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .button {
      display: inline-block;
      background: #334155;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 5px;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
    }
    .summary {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${alertCount === 1 ? 'Actualización' : 'Actualizaciones'} en Boletín Judicial</h1>
    <div class="badge">${new Date(bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Tijuana'
    })}</div>
  </div>

  <div class="content">
    <p>Estimado${userName ? ' ' + userName : ''} usuario,</p>

    <div class="summary">
      Se ${alertCount === 1 ? 'ha detectado' : 'han detectado'} <strong>${alertCount} ${alertCount === 1 ? 'actualización' : 'actualizaciones'}</strong> en los boletines judiciales del Poder Judicial de Baja California.
    </div>

    ${alerts.map((alert, index) => `
    <div class="alert-box">
      <div class="case-header">
        ${alert.matchedOn === 'name' ? 'Coincidencia por Nombre' : 'Actualización de Caso'} ${index + 1} de ${alertCount}
      </div>
      ${alert.matchedOn === 'name' ? `
      <div class="detail-row">
        <span class="label">Nombre Monitoreado:</span> ${alert.monitoredName || 'Desconocido'}
      </div>
      <div class="detail-row">
        <span class="label">Encontrado en Expediente:</span> ${alert.caseNumber}
      </div>
      ` : `
      <div class="detail-row">
        <span class="label">Número de Expediente:</span> ${alert.caseNumber}
      </div>
      ${alert.caseName ? `<div class="detail-row"><span class="label">Referencia:</span> ${alert.caseName}</div>` : ''}
      `}
      <div class="detail-row">
        <span class="label">Juzgado:</span> ${alert.juzgado}
      </div>
      <div class="case-details">${alert.rawText}</div>
      ${alert.bulletinUrl ? `
      <div style="text-align: center; margin-top: 15px;">
        <a href="${alert.bulletinUrl}" class="button">Consultar Boletín Oficial</a>
      </div>
      ` : ''}
    </div>
    `).join('')}

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Puede consultar el detalle completo de estas actualizaciones en su panel de control.
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
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .invitation-box {
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .invitation-box p {
      margin: 10px 0;
    }
    .owner-name {
      font-weight: 600;
      color: #667eea;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      margin: 10px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s;
    }
    .button-accept {
      background: #667eea;
      color: white;
    }
    .button-accept:hover {
      background: #5568d3;
    }
    .button-reject {
      background: #e0e0e0;
      color: #666;
    }
    .button-reject:hover {
      background: #d0d0d0;
    }
    .info-section {
      background: #f0f7ff;
      border-radius: 6px;
      padding: 20px;
      margin: 25px 0;
    }
    .info-section h3 {
      margin-top: 0;
      color: #667eea;
      font-size: 18px;
    }
    .info-section ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .info-section li {
      margin: 8px 0;
    }
    .expiration {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .footer {
      background: #f9f9f9;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 Invitación de Colaboración</h1>
      <p>Monitor Judicial</p>
    </div>

    <div class="content">
      <p>Estimado usuario,</p>

      <div class="invitation-box">
        <p><span class="owner-name">${ownerDisplay}</span> te ha invitado a colaborar en su cuenta de Monitor Judicial.</p>
      </div>

      <p>Como colaborador, recibirás notificaciones por email cuando se detecten actualizaciones en los casos judiciales que <strong>${ownerDisplay}</strong> te asigne específicamente.</p>

      <div class="button-container">
        <a href="${acceptUrl}" class="button button-accept">✓ Aceptar Invitación</a>
        <a href="${rejectUrl}" class="button button-reject">✗ Rechazar Invitación</a>
      </div>

      <div class="expiration">
        ⏰ Esta invitación expirará el <strong>${formattedDate}</strong>
      </div>

      <div class="info-section">
        <h3>¿Qué es Monitor Judicial?</h3>
        <p>Monitor Judicial es un sistema automatizado que rastrea boletines judiciales del Poder Judicial de Baja California y notifica cuando aparecen casos específicos.</p>

        <h3>Como colaborador podrás:</h3>
        <ul>
          <li>Recibir alertas por email de casos asignados</li>
          <li>Acceder al historial de actualizaciones</li>
          <li>Colaborar con ${ownerDisplay} en el seguimiento de casos</li>
        </ul>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Si no reconoces a <strong>${ownerDisplay}</strong> o no deseas colaborar, simplemente ignora este correo o haz clic en "Rechazar Invitación".
      </p>
    </div>

    <div class="footer">
      <p>Monitor Judicial - Poder Judicial de Baja California</p>
      <p><a href="${baseUrl}">https://monitorjudicial.com.mx</a></p>
      <p style="margin-top: 15px; font-size: 12px; color: #999;">
        Este es un correo automático. Por favor no respondas a este mensaje.
      </p>
    </div>
  </div>
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
      subject: `Invitación para colaborar en Monitor Judicial`,
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
