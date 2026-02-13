/**
 * Direct email test to rodriamarog@gmail.com
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { Resend } from 'resend'

async function testMyEmail() {
  console.log('📧 Testing Email to rodriamarog@gmail.com\n')

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY not found in environment')
    return
  }

  console.log('✅ RESEND_API_KEY found')
  console.log(`   Key starts with: ${resendApiKey.substring(0, 10)}...\n`)

  const resend = new Resend(resendApiKey)

  // Test email HTML
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    }
    .ai-summary {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚖️ TEST - Tribunal Electrónico</h1>
  </div>
  <div class="content">
    <p>Hola Rodrigo,</p>
    <p>Este es un <strong>correo de prueba</strong> del nuevo sistema de notificaciones por email para Tribunal Electrónico.</p>
    <div class="alert-box">
      <p><strong>Expediente:</strong> 99999/2025 (PRUEBA)</p>
      <p><strong>Juzgado:</strong> JUZGADO DE PRUEBA</p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
    </div>
    <h3>📝 Resumen de IA:</h3>
    <div class="ai-summary">
      Este es un ejemplo de cómo se vería el resumen generado por IA en los correos de Tribunal Electrónico.
      ¡El sistema de emails está funcionando correctamente! ✅
    </div>
    <p>Si recibiste este correo, significa que:</p>
    <ul>
      <li>✅ El sistema de emails está configurado correctamente</li>
      <li>✅ Resend API está funcionando</li>
      <li>✅ Los emails de Tribunal Electrónico llegarán sin problemas</li>
    </ul>
  </div>
</body>
</html>
  `

  const emailText = `
TEST - Tribunal Electrónico

Hola Rodrigo,

Este es un correo de prueba del nuevo sistema de notificaciones por email para Tribunal Electrónico.

Expediente: 99999/2025 (PRUEBA)
Juzgado: JUZGADO DE PRUEBA
Fecha: ${new Date().toLocaleDateString('es-MX')}

Resumen de IA:
Este es un ejemplo de cómo se vería el resumen generado por IA. ¡El sistema está funcionando! ✅

Si recibiste este correo, significa que el sistema está configurado correctamente.
  `

  try {
    console.log('📤 Sending email via Resend...\n')

    const result = await resend.emails.send({
      from: 'Monitor Judicial PJBC <onboarding@resend.dev>',
      to: 'rodriamarog@gmail.com',
      subject: '🧪 TEST - Nuevo Sistema de Emails Tribunal Electrónico',
      html: emailHtml,
      text: emailText,
    })

    console.log('✅ Email sent successfully!')
    console.log(`   Email ID: ${result.data?.id}`)
    console.log(`\n📧 Check your inbox at: rodriamarog@gmail.com`)
    console.log(`   - Check INBOX`)
    console.log(`   - Check SPAM/JUNK folder`)
    console.log(`   - Check PROMOTIONS tab (if using Gmail)`)
    console.log(`   - Search for: "TEST Tribunal"`)

    if (result.error) {
      console.error('\n❌ Resend returned an error:', result.error)
    }

  } catch (error) {
    console.error('\n❌ Failed to send email:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
      console.error('   Error stack:', error.stack)
    }
  }
}

testMyEmail()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
