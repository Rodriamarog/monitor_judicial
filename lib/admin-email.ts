/**
 * Admin Email Notification Service
 *
 * Sends email alerts to admin when new juzgados are detected
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface NewJuzgado {
  name: string;
  first_seen: string;
  last_seen: string;
  appearance_count: number;
}

interface NewJuzgadosEmailData {
  adminEmail: string;
  juzgados: NewJuzgado[];
  detectionDate: string;
}

/**
 * Send email notification to admin about new juzgados
 */
export async function sendNewJuzgadosAlert(
  data: NewJuzgadosEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API key not configured',
    };
  }

  try {
    const { adminEmail, juzgados, detectionDate } = data;
    const count = juzgados.length;

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
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .warning-icon {
      font-size: 28px;
    }
    .content {
      padding: 30px;
    }
    .summary {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .summary p {
      margin: 5px 0;
      font-size: 16px;
    }
    .summary .count {
      font-size: 32px;
      font-weight: bold;
      color: #ef4444;
      margin: 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
    }
    th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .juzgado-name {
      font-weight: 500;
      color: #1f2937;
    }
    .date {
      color: #6b7280;
      font-size: 14px;
    }
    .count-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .action-section {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .action-section h3 {
      margin-top: 0;
      color: #065f46;
    }
    .action-section ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .action-section li {
      margin: 8px 0;
      color: #047857;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .timestamp {
      color: #9ca3af;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span class="warning-icon">⚠️</span>
        Nuevos Juzgados Detectados
      </h1>
    </div>

    <div class="content">
      <div class="summary">
        <p>Se encontraron:</p>
        <div class="count">${count}</div>
        <p>${count === 1 ? 'juzgado nuevo' : 'juzgados nuevos'} en los boletines que no están en la tabla de juzgados.</p>
      </div>

      <h2>Detalles de los Juzgados Detectados</h2>

      <table>
        <thead>
          <tr>
            <th>Juzgado</th>
            <th>Primera Aparición</th>
            <th>Última Aparición</th>
            <th style="text-align: center;">Apariciones</th>
          </tr>
        </thead>
        <tbody>
          ${juzgados
            .map(
              (juzgado) => `
          <tr>
            <td class="juzgado-name">${juzgado.name}</td>
            <td class="date">${formatDate(juzgado.first_seen)}</td>
            <td class="date">${formatDate(juzgado.last_seen)}</td>
            <td style="text-align: center;">
              <span class="count-badge">${juzgado.appearance_count}</span>
            </td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="action-section">
        <h3>📋 Acciones Recomendadas</h3>
        <ul>
          <li>Revisar cada juzgado para determinar si es legítimo o basura</li>
          <li>Si es legítimo: Agregarlo manualmente a la tabla <code>juzgados</code></li>
          <li>Si es una variante de formato: Normalizar el nombre existente</li>
          <li>Si es basura: Actualizar los filtros en el cron para excluirlo</li>
          <li>Si es temporal: Ignorar (puede desaparecer en futuros boletines)</li>
        </ul>
      </div>

      <p class="timestamp">
        Detección realizada el: ${detectionDate}
      </p>
    </div>

    <div class="footer">
      Monitor Judicial - Sistema de Alertas Administrativas<br>
      Este correo es solo para administradores
    </div>
  </div>
</body>
</html>
    `;

    const emailText = `
⚠️ NUEVOS JUZGADOS DETECTADOS - Monitor Judicial

Se encontraron ${count} ${count === 1 ? 'juzgado nuevo' : 'juzgados nuevos'} en los boletines que no están en la tabla de juzgados.

DETALLES:
${juzgados
  .map(
    (juzgado, i) => `
${i + 1}. ${juzgado.name}
   Primera aparición: ${formatDate(juzgado.first_seen)}
   Última aparición: ${formatDate(juzgado.last_seen)}
   Apariciones totales: ${juzgado.appearance_count}
`
  )
  .join('\n')}

ACCIONES RECOMENDADAS:
- Revisar cada juzgado para determinar si es legítimo o basura
- Si es legítimo: Agregarlo manualmente a la tabla 'juzgados'
- Si es una variante de formato: Normalizar el nombre existente
- Si es basura: Actualizar los filtros en el cron para excluirlo
- Si es temporal: Ignorar (puede desaparecer en futuros boletines)

Detección realizada el: ${detectionDate}

---
Monitor Judicial - Sistema de Alertas Administrativas
Este correo es solo para administradores
    `;

    const { data: sendData, error } = await resend.emails.send({
      from: 'Monitor Judicial <noreply@monitorjudicial.com.mx>',
      to: adminEmail,
      subject: `⚠️ Nuevos Juzgados Detectados (${count}) - Monitor Judicial`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}

/**
 * Format date for display in Spanish
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tijuana',
  });
}
