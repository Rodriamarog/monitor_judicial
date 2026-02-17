/**
 * Test script for redesigned alert emails
 * Sends test versions of:
 * 1. Bulletin (boletin) batch alert email
 * 2. Tribunal Electrónico alert email
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { Resend } from 'resend'

const TO_EMAIL = 'rodriamarog@gmail.com'
const FROM_EMAIL = 'Monitor Judicial <noreply@monitorjudicial.com.mx>'

async function sendBoletinTest(resend: Resend) {
  const bulletinDate = '2026-02-14'
  const formattedDate = new Date(bulletinDate + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tijuana',
  })

  const alerts = [
    {
      matchedOn: 'case_number' as const,
      caseNumber: '1234/2024',
      caseName: 'GARCIA LOPEZ VS HERNANDEZ',
      juzgado: 'JUZGADO SEGUNDO DE LO CIVIL DEL PARTIDO JUDICIAL DE TIJUANA',
      rawText: 'SE HACE SABER A LAS PARTES QUE EL DIA 20 DE FEBRERO DEL 2026 A LAS 10:00 HRS SE CELEBRARA AUDIENCIA DE DESAHOGO DE PRUEBAS EN EL PRESENTE JUICIO. NOTIFIQUESE.',
      bulletinUrl: 'https://monitorjudicial.com.mx',
    },
    {
      matchedOn: 'name' as const,
      monitoredName: 'JUAN GARCIA LOPEZ',
      caseNumber: '5678/2023',
      juzgado: 'JUZGADO PRIMERO FAMILIAR DEL PARTIDO JUDICIAL DE MEXICALI',
      rawText: 'VISTO EL ESCRITO PRESENTADO POR LA PARTE ACTORA, SE TIENE POR ANUNCIADAS LAS PRUEBAS DOCUMENTALES OFRECIDAS. CITESE A LAS PARTES PARA EL DIA 25 DE FEBRERO A LAS 09:00 HRS.',
      bulletinUrl: 'https://monitorjudicial.com.mx',
    },
  ]

  const alertCount = alerts.length

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
                    <span style="font-size: 12px; color: #999999;">${formattedDate}</span>
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

                <!-- Alert header -->
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8f8f8; border-bottom: 1px solid #e8e8e8;">
                    <span style="font-size: 11px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${alert.matchedOn === 'name' ? 'Coincidencia por nombre' : 'Actualizacion de expediente'}
                    </span>
                  </td>
                </tr>

                <!-- Alert body -->
                <tr>
                  <td style="padding: 16px;">
                    ${alert.matchedOn === 'name' ? `
                    <p style="margin: 0 0 6px; font-size: 13px; color: #888888;">Nombre monitoreado</p>
                    <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #111111;">${alert.monitoredName}</p>
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
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `[TEST] ${alertCount} actualizacion${alertCount !== 1 ? 'es' : ''} en boletin judicial - PJBC`,
    html: emailHtml,
    text: `Monitor Judicial\n\n${alertCount} nueva${alertCount !== 1 ? 's actualizaciones' : ' actualizacion'} en boletin judicial del ${formattedDate}.\n\nVer en el panel: https://monitorjudicial.com.mx/dashboard/alerts`,
  })
}

async function sendTribunalTest(resend: Resend) {
  const fecha = '2026-02-14'
  const formattedDate = new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tijuana',
  })

  const expediente = '1234/2024-III'
  const juzgado = 'JUZGADO TERCERO DE LO CIVIL DEL PARTIDO JUDICIAL DE TIJUANA, B.C.'
  const descripcion = 'ACUERDO. Tijuana, Baja California, a catorce de febrero del dos mil veintiséis.\n\nVisto el escrito de cuenta, presentado por la parte actora, mediante el cual solicita vista del expediente y ofrece pruebas documentales, por sus propios meritos se tiene por recibido.\n\nEn relacion a lo solicitado, AGREGUESE a los autos del juicio que nos ocupa. NOTIFIQUESE.'
  const aiSummary = 'La parte actora presentó un escrito solicitando vista del expediente y ofreciendo pruebas documentales. El juez ordenó agregar el escrito al expediente y notificar a las partes. No hay citacion a audiencia en este acuerdo.'

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
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `[TEST] Nuevo documento en caso ${expediente}`,
    html: emailHtml,
    text: `Monitor Judicial\n\nNuevo documento en Tribunal Electronico\n\nExpediente: ${expediente}\nJuzgado: ${juzgado}\nFecha: ${formattedDate}\n\nResumen: ${aiSummary}\n\nVer en el panel: https://monitorjudicial.com.mx/dashboard/alerts`,
  })
}

async function main() {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not found in .env.local')
    process.exit(1)
  }

  const resend = new Resend(resendApiKey)

  console.log('Sending test emails to', TO_EMAIL, '...\n')

  // Send both test emails
  const [boletinResult, tribunalResult] = await Promise.all([
    sendBoletinTest(resend),
    sendTribunalTest(resend),
  ])

  if (boletinResult.error) {
    console.error('Boletin email failed:', boletinResult.error)
  } else {
    console.log('Boletin email sent:', boletinResult.data?.id)
  }

  if (tribunalResult.error) {
    console.error('Tribunal email failed:', tribunalResult.error)
  } else {
    console.log('Tribunal email sent:', tribunalResult.data?.id)
  }

  console.log('\nCheck your inbox at:', TO_EMAIL)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
