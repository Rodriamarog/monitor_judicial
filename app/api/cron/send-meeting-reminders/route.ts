import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const CRON_SECRET = process.env.CRON_SECRET || 'development'

// Service role client for cron job
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

// Twilio client
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio configuration missing')
  }

  return twilio(accountSid, authToken)
}

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const twilioClient = getTwilioClient()
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM

    if (!twilioFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM not configured')
    }

    // Find pending reminders that are due
    const { data: reminders, error: fetchError } = await supabase
      .from('meeting_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50) // Process max 50 at a time

    if (fetchError) {
      throw fetchError
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders due',
        processed: 0,
      })
    }

    console.log(`Found ${reminders.length} reminders to send`)

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const reminder of reminders) {
      let lawyerSent = false
      let clientSent = false
      let errorMessage: string | null = null

      try {
        // Send reminder to lawyer
        if (reminder.lawyer_phone) {
          try {
            await twilioClient.messages.create({
              from: twilioFrom,
              to: reminder.lawyer_phone,
              body: reminder.reminder_message,
            })
            lawyerSent = true
            console.log(`Sent lawyer reminder for meeting ${reminder.id}`)
          } catch (lawyerError: any) {
            console.error('Error sending to lawyer:', lawyerError)
            errorMessage = `Lawyer SMS failed: ${lawyerError.message}`
          }
        }

        // Send reminder to client (if they have phone)
        if (reminder.client_phone && reminder.client_name) {
          try {
            const clientMessage = `Recordatorio de reunión mañana a las ${new Date(
              reminder.meeting_time
            ).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })} con ${reminder.lawyer_name}`

            await twilioClient.messages.create({
              from: twilioFrom,
              to: reminder.client_phone,
              body: clientMessage,
            })
            clientSent = true
            console.log(`Sent client reminder for meeting ${reminder.id}`)
          } catch (clientError: any) {
            console.error('Error sending to client:', clientError)
            errorMessage = errorMessage
              ? `${errorMessage}; Client SMS failed: ${clientError.message}`
              : `Client SMS failed: ${clientError.message}`
          }
        }

        // Update reminder status
        const updateData: any = {
          updated_at: new Date().toISOString(),
        }

        if (lawyerSent) {
          updateData.lawyer_sent_at = new Date().toISOString()
        }

        if (clientSent) {
          updateData.client_sent_at = new Date().toISOString()
        }

        // Mark as sent if at least one message was sent, or failed if both failed
        if (lawyerSent || clientSent) {
          updateData.status = 'sent'
          sent++
        } else {
          updateData.status = 'failed'
          updateData.error_message = errorMessage || 'No phone numbers available'
          failed++
          errors.push(`Reminder ${reminder.id}: ${updateData.error_message}`)
        }

        await supabase
          .from('meeting_reminders')
          .update(updateData)
          .eq('id', reminder.id)
      } catch (error: any) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        failed++
        errors.push(`Reminder ${reminder.id}: ${error.message}`)

        // Mark as failed
        await supabase
          .from('meeting_reminders')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id)
      }
    }

    return NextResponse.json({
      success: true,
      processed: reminders.length,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
