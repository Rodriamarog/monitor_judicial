import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

// Supabase service client (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Initialize Twilio client
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }

  return twilio(accountSid, authToken)
}

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }

  // Support both "Bearer TOKEN" and just "TOKEN"
  const token = authHeader?.replace('Bearer ', '') || ''
  return token === cronSecret
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()
    const twilioClient = getTwilioClient()
    const twilioFromNumber = process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '')

    if (!twilioFromNumber) {
      throw new Error('TWILIO_WHATSAPP_FROM not configured')
    }

    // Find all pending reminders that are due
    const { data: reminders, error: fetchError } = await supabase
      .from('meeting_reminders')
      .select(`
        id,
        lawyer_phone,
        client_phone,
        reminder_message,
        meeting_time,
        client_name,
        lawyer_name
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (fetchError) {
      throw fetchError
    }

    if (!reminders || reminders.length === 0) {
      console.log('No reminders to send')
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        message: 'No reminders due',
      })
    }

    console.log(`Found ${reminders.length} reminder(s) to send`)

    let sent = 0
    let failed = 0

    // Process each reminder
    for (const reminder of reminders) {
      try {
        let lawyerSent = false
        let clientSent = false

        // Send SMS to lawyer if phone exists
        if (reminder.lawyer_phone) {
          try {
            const lawyerPhone = reminder.lawyer_phone.replace('whatsapp:', '')

            await twilioClient.messages.create({
              from: twilioFromNumber,
              to: lawyerPhone,
              body: reminder.reminder_message,
            })

            lawyerSent = true
            console.log(`✅ Sent lawyer SMS for reminder ${reminder.id} to ${lawyerPhone}`)

            // Update lawyer_sent_at
            await supabase
              .from('meeting_reminders')
              .update({ lawyer_sent_at: new Date().toISOString() })
              .eq('id', reminder.id)

          } catch (error) {
            console.error(`❌ Failed to send lawyer SMS for reminder ${reminder.id}:`, error)
          }
        }

        // Send SMS to client if phone exists
        if (reminder.client_phone) {
          try {
            const clientPhone = reminder.client_phone.replace('whatsapp:', '')

            // Format time in Tijuana timezone
            const meetingTime = new Date(reminder.meeting_time)
            const timeString = meetingTime.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Tijuana',
            })

            let clientMessage = `Recordatorio: Tienes una reunión mañana a las ${timeString}`

            if (reminder.lawyer_name) {
              clientMessage += ` con ${reminder.lawyer_name}`
            }

            clientMessage += '. Te esperamos!'

            await twilioClient.messages.create({
              from: twilioFromNumber,
              to: clientPhone,
              body: clientMessage,
            })

            clientSent = true
            console.log(`✅ Sent client SMS for reminder ${reminder.id} to ${clientPhone}`)

            // Update client_sent_at
            await supabase
              .from('meeting_reminders')
              .update({ client_sent_at: new Date().toISOString() })
              .eq('id', reminder.id)

          } catch (error) {
            console.error(`❌ Failed to send client SMS for reminder ${reminder.id}:`, error)
          }
        }

        // Mark as sent if at least one SMS was sent
        if (lawyerSent || clientSent) {
          await supabase
            .from('meeting_reminders')
            .update({
              status: 'sent',
              updated_at: new Date().toISOString(),
            })
            .eq('id', reminder.id)

          sent++
        } else {
          // Mark as failed if no SMS was sent
          await supabase
            .from('meeting_reminders')
            .update({
              status: 'failed',
              error_message: 'No phone numbers available or SMS sending failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', reminder.id)

          failed++
        }

      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error)

        // Mark as failed
        await supabase
          .from('meeting_reminders')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id)

        failed++
      }
    }

    const result = {
      success: true,
      processed: reminders.length,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    }

    console.log('Reminder sending complete:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Cron job error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
