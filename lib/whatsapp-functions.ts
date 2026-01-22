import { createClient } from '@supabase/supabase-js'
import { normalizeName } from './name-variations'
import { fromZonedTime } from 'date-fns-tz'

// Use service role client for webhook operations (bypasses RLS)
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

// Function call handler results
export interface FunctionResult {
  success: boolean
  message?: string
  data?: any
  error?: string
  needs_clarification?: boolean
}

// Handler: Search cases by client name
export async function handleSearchCases(
  args: { query: string },
  userId: string
): Promise<FunctionResult> {
  try {
    const { query } = args
    const supabase = getServiceClient()

    // Normalize query for fuzzy matching
    const normalized = normalizeName(query)

    // Strategy 1: Try exact word matching first (fast)
    const searchTerms = normalized.split(/\s+/).filter(term => term.length > 0)
    let queryBuilder = supabase
      .from('monitored_cases')
      .select('id, case_number, juzgado, nombre, total_amount_charged, currency')
      .eq('user_id', userId)

    // Add ILIKE condition for each search term
    searchTerms.forEach(term => {
      queryBuilder = queryBuilder.ilike('nombre', `%${term}%`)
    })

    let { data: cases, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      throw error
    }

    // Strategy 2: If no results, use fuzzy matching (handles typos)
    if (!cases || cases.length === 0) {
      console.log('No exact matches, trying fuzzy search...')

      const { data: fuzzyCases, error: fuzzyError } = await supabase.rpc(
        'search_cases_fuzzy',
        {
          p_user_id: userId,
          p_query: normalized,
          p_limit: 5
        }
      )

      if (fuzzyError) {
        console.error('Fuzzy search error:', fuzzyError)
        // Fall back to original empty result
      } else {
        cases = fuzzyCases
      }
    }

    if (!cases || cases.length === 0) {
      return {
        success: false,
        message: `No encontré ningún caso con el nombre "${query}". ¿Podrías verificar el nombre?`,
      }
    }

    // Calculate balance for each case
    const casesWithBalance = await Promise.all(
      cases.map(async (caseItem) => {
        const { data: payments } = await supabase
          .from('case_payments')
          .select('amount')
          .eq('case_id', caseItem.id)

        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        const totalCharged = caseItem.total_amount_charged || 0
        const balance = totalCharged - totalPaid

        return {
          ...caseItem,
          totalPaid,
          balance,
        }
      })
    )

    if (casesWithBalance.length === 1) {
      const c = casesWithBalance[0]
      return {
        success: true,
        data: { cases: casesWithBalance },
        message: `*Caso encontrado:*\n${c.nombre}\nExpediente: ${c.case_number}\nBalance actual: $${c.balance.toFixed(2)} ${c.currency}`,
      }
    }

    // Multiple cases found - needs clarification
    const caseList = casesWithBalance
      .map((c, i) => `${i + 1}. ${c.nombre}\n   Expediente: ${c.case_number}\n   Balance: $${c.balance.toFixed(2)} ${c.currency}`)
      .join('\n\n')

    return {
      success: true,
      data: { cases: casesWithBalance },
      needs_clarification: true,
      message: `Encontré ${casesWithBalance.length} casos con ese nombre:\n\n${caseList}\n\n¿A cuál te refieres? Puedes responder con el número o con el número de expediente.`,
    }
  } catch (error) {
    console.error('Error searching cases:', error)
    return {
      success: false,
      error: 'Error al buscar casos. Por favor intenta de nuevo.',
    }
  }
}

// Handler: Get case balance
export async function handleGetCaseBalance(
  args: { case_id: string },
  userId: string
): Promise<FunctionResult> {
  try {
    const { case_id } = args
    const supabase = getServiceClient()

    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .from('monitored_cases')
      .select('id, case_number, nombre, total_amount_charged, currency')
      .eq('id', case_id)
      .eq('user_id', userId)
      .single()

    if (caseError || !caseData) {
      return {
        success: false,
        error: 'No se encontró el caso o no tienes acceso a él.',
      }
    }

    // Get all payments for this case
    const { data: payments, error: paymentsError } = await supabase
      .from('case_payments')
      .select('amount')
      .eq('case_id', case_id)

    if (paymentsError) {
      throw paymentsError
    }

    // Calculate balance
    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const totalCharged = caseData.total_amount_charged || 0
    const balance = totalCharged - totalPaid

    return {
      success: true,
      data: {
        case: caseData,
        totalCharged,
        totalPaid,
        balance,
      },
      message: `Caso: ${caseData.nombre} (${caseData.case_number})\nTotal cobrado: $${totalCharged.toFixed(2)} ${caseData.currency}\nTotal pagado: $${totalPaid.toFixed(2)} ${caseData.currency}\nBalance pendiente: $${balance.toFixed(2)} ${caseData.currency}`,
    }
  } catch (error) {
    console.error('Error getting case balance:', error)
    return {
      success: false,
      error: 'Error al obtener el balance del caso.',
    }
  }
}

// Handler: Add payment
export async function handleAddPayment(
  args: { case_id: string; amount: number; notes?: string },
  userId: string
): Promise<FunctionResult> {
  try {
    const { case_id, amount, notes } = args
    const supabase = getServiceClient()

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'El monto del pago debe ser mayor a 0.',
      }
    }

    // Get case details first
    const { data: caseData, error: caseError } = await supabase
      .from('monitored_cases')
      .select('id, case_number, nombre, total_amount_charged, currency')
      .eq('id', case_id)
      .eq('user_id', userId)
      .single()

    if (caseError || !caseData) {
      return {
        success: false,
        error: 'No se encontró el caso o no tienes acceso a él.',
      }
    }

    // Get current payments to calculate balance
    const { data: payments, error: paymentsError } = await supabase
      .from('case_payments')
      .select('amount')
      .eq('case_id', case_id)

    if (paymentsError) {
      throw paymentsError
    }

    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const totalCharged = caseData.total_amount_charged || 0
    const oldBalance = totalCharged - totalPaid

    // Insert payment (always use today's date)
    const todayDate = new Date().toISOString().split('T')[0]
    const { error: insertError } = await supabase
      .from('case_payments')
      .insert({
        case_id,
        user_id: userId,
        amount,
        payment_date: todayDate,
        notes: notes || null,
      })

    if (insertError) {
      throw insertError
    }

    const newBalance = oldBalance - amount

    return {
      success: true,
      message: `✅ Pago registrado exitosamente

Caso: ${caseData.nombre}
Expediente: ${caseData.case_number}

Monto del pago: $${amount.toFixed(2)} ${caseData.currency}
Balance anterior: $${oldBalance.toFixed(2)} ${caseData.currency}
Nuevo balance: $${newBalance.toFixed(2)} ${caseData.currency}

El pago se registró con fecha de hoy.`,
      data: {
        case: caseData,
        payment: {
          amount,
          payment_date: todayDate,
          notes,
        },
        oldBalance,
        newBalance,
      },
    }
  } catch (error) {
    console.error('Error adding payment:', error)
    return {
      success: false,
      error: 'Error al registrar el pago. Por favor intenta de nuevo.',
    }
  }
}

// Handler: Create calendar meeting with optional reminder
export async function handleCreateMeeting(
  args: {
    title: string
    client_case_id?: string
    start_time: string // ISO 8601 datetime
    duration_minutes: number
    create_reminder: boolean
  },
  userId: string
): Promise<FunctionResult> {
  try {
    const { title, client_case_id, start_time, duration_minutes, create_reminder } = args
    const supabase = getServiceClient()

    // Get user info for lawyer name, phone, and timezone
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('full_name, phone, timezone')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return {
        success: false,
        error: 'No se pudo obtener tu información de perfil.',
      }
    }

    // Parse and validate times using user's timezone
    // AI sends: "2026-01-25T18:00:00" (no timezone)
    // We interpret this as "6pm in user's timezone"
    const userTimezone = userProfile.timezone || 'America/Tijuana'

    const startTime = fromZonedTime(start_time, userTimezone)
    if (isNaN(startTime.getTime())) {
      return {
        success: false,
        error: 'Fecha/hora inválida. Usa formato: 2024-02-10T17:00:00',
      }
    }

    const endTime = new Date(startTime.getTime() + duration_minutes * 60 * 1000)

    // Get client info if case_id provided
    let clientName: string | null = null
    let clientPhone: string | null = null
    let caseNumber: string | null = null

    if (client_case_id) {
      const { data: caseData, error: caseError } = await supabase
        .from('monitored_cases')
        .select('nombre, telefono, case_number')
        .eq('id', client_case_id)
        .eq('user_id', userId)
        .single()

      if (caseError || !caseData) {
        return {
          success: false,
          error: 'No se encontró el caso especificado.',
        }
      }

      clientName = caseData.nombre
      clientPhone = caseData.telefono
      caseNumber = caseData.case_number
    }

    // Create calendar event
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        title,
        description: clientName ? `Reunión con cliente: ${clientName}` : null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select()
      .single()

    if (eventError) {
      throw eventError
    }

    let reminderCreated = false
    let reminderMessage = ''

    // Create reminder if requested
    if (create_reminder) {
      if (!userProfile.phone) {
        return {
          success: true,
          message: `✅ Reunión agendada para ${startTime.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })} a las ${startTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}\n\n⚠️ No se pudo crear el recordatorio: no tienes un número de teléfono registrado en tu perfil.`,
          data: { event }
        }
      }

      // Calculate reminder time (24 hours before)
      const reminderTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
      const lawyerName = userProfile.full_name || 'tu abogado'

      const { error: reminderError } = await supabase
        .from('meeting_reminders')
        .insert({
          calendar_event_id: event.id,
          case_id: client_case_id || null,
          user_id: userId,
          lawyer_name: lawyerName,
          lawyer_phone: userProfile.phone,
          client_name: clientName,
          client_phone: clientPhone,
          meeting_time: startTime.toISOString(),
          scheduled_for: reminderTime.toISOString(),
          reminder_message: `Recordatorio de reunión mañana a las ${startTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}${clientPhone ? ` con ${clientName || 'tu cliente'}` : ''}`,
        })

      if (reminderError) {
        console.error('Error creating reminder:', reminderError)
      } else {
        reminderCreated = true
        reminderMessage = clientPhone
          ? `\n\n📱 Recordatorios programados para ti y ${clientName} (${clientPhone}) un día antes.`
          : `\n\n📱 Recordatorio programado para ti un día antes.${clientName && !clientPhone ? `\n\n⚠️ ${clientName} no tiene teléfono registrado, no recibirá recordatorio.` : ''}`
      }
    }

    return {
      success: true,
      message: `✅ Reunión agendada exitosamente

*${title}*${clientName ? `\nCliente: ${clientName}` : ''}${caseNumber ? `\nExpediente: ${caseNumber}` : ''}
Fecha: ${startTime.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Hora: ${startTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}${reminderMessage}`,
      data: { event, reminderCreated },
    }
  } catch (error) {
    console.error('Error creating meeting:', error)
    return {
      success: false,
      error: 'Error al crear la reunión. Por favor intenta de nuevo.',
    }
  }
}

// Handler: Check if client has phone number
export async function handleCheckClientPhone(
  args: { case_id: string },
  userId: string
): Promise<FunctionResult> {
  try {
    const { case_id } = args
    const supabase = getServiceClient()

    const { data: caseData, error } = await supabase
      .from('monitored_cases')
      .select('nombre, telefono, case_number')
      .eq('id', case_id)
      .eq('user_id', userId)
      .single()

    if (error || !caseData) {
      return {
        success: false,
        error: 'No se encontró el caso especificado.',
      }
    }

    const hasPhone = !!caseData.telefono

    return {
      success: true,
      data: {
        case_id,
        client_name: caseData.nombre,
        case_number: caseData.case_number,
        has_phone: hasPhone,
        phone: caseData.telefono,
      },
      message: hasPhone
        ? `${caseData.nombre} tiene teléfono registrado: ${caseData.telefono}`
        : `⚠️ ${caseData.nombre} NO tiene teléfono registrado. Para enviar recordatorios, agrega el teléfono en la plataforma.`,
    }
  } catch (error) {
    console.error('Error checking client phone:', error)
    return {
      success: false,
      error: 'Error al verificar el teléfono del cliente.',
    }
  }
}

// Handler: Get calendar events for a date range
export async function handleGetCalendarEvents(
  args: { start_date: string; end_date: string },
  userId: string
): Promise<FunctionResult> {
  try {
    const { start_date, end_date } = args
    const supabase = getServiceClient()

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, description, start_time, end_time, location')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('start_time', start_date)
      .lte('start_time', end_date)
      .order('start_time', { ascending: true })
      .limit(20)

    if (error) {
      throw error
    }

    if (!events || events.length === 0) {
      return {
        success: true,
        data: { events: [] },
        message: 'No tienes reuniones agendadas en ese período.',
      }
    }

    const eventList = events
      .map((e, i) => {
        const startDate = new Date(e.start_time)
        return `${i + 1}. *${e.title}*\n   Fecha: ${startDate.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}\n   Hora: ${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
      })
      .join('\n\n')

    return {
      success: true,
      data: { events },
      message: `Tienes ${events.length} reunión(es) agendada(s):\n\n${eventList}`,
    }
  } catch (error) {
    console.error('Error getting calendar events:', error)
    return {
      success: false,
      error: 'Error al obtener las reuniones del calendario.',
    }
  }
}

// Handler: Get upcoming reminders
export async function handleGetUpcomingReminders(
  args: { days_ahead?: number },
  userId: string
): Promise<FunctionResult> {
  try {
    const daysAhead = args.days_ahead || 7 // Default 7 days
    const supabase = getServiceClient()

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    const { data: reminders, error } = await supabase
      .from('meeting_reminders')
      .select('id, client_name, meeting_time, scheduled_for, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('scheduled_for', endDate.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(20)

    if (error) {
      throw error
    }

    if (!reminders || reminders.length === 0) {
      return {
        success: true,
        data: { reminders: [] },
        message: `No tienes recordatorios programados para los próximos ${daysAhead} días.`,
      }
    }

    const reminderList = reminders
      .map((r, i) => {
        const meetingDate = new Date(r.meeting_time)
        const reminderDate = new Date(r.scheduled_for)
        return `${i + 1}. Reunión con *${r.client_name || 'sin cliente'}*\n   Fecha reunión: ${meetingDate.toLocaleDateString('es-MX', {
          month: 'long',
          day: 'numeric',
        })} a las ${meetingDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}\n   Recordatorio: ${reminderDate.toLocaleDateString('es-MX', {
          month: 'long',
          day: 'numeric',
        })} a las ${reminderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
      })
      .join('\n\n')

    return {
      success: true,
      data: { reminders },
      message: `Tienes ${reminders.length} recordatorio(s) programado(s):\n\n${reminderList}`,
    }
  } catch (error) {
    console.error('Error getting reminders:', error)
    return {
      success: false,
      error: 'Error al obtener los recordatorios.',
    }
  }
}

// Handler: Delete (cancel) a calendar meeting
export async function handleDeleteMeeting(
  args: { event_id: string },
  userId: string
): Promise<FunctionResult> {
  try {
    const { event_id } = args
    const supabase = getServiceClient()

    // Get the event to verify ownership and get details
    const { data: event, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title, start_time')
      .eq('id', event_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !event) {
      return {
        success: false,
        error: 'No se encontró la reunión o ya fue cancelada.',
      }
    }

    // Soft delete the event
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', event_id)
      .eq('user_id', userId)

    if (deleteError) {
      throw deleteError
    }

    // Cancel associated reminder if exists
    const { error: reminderError } = await supabase
      .from('meeting_reminders')
      .update({ status: 'cancelled' })
      .eq('calendar_event_id', event_id)
      .eq('user_id', userId)
      .eq('status', 'pending')

    // Don't fail if reminder doesn't exist
    if (reminderError) {
      console.warn('No reminder found to cancel:', reminderError)
    }

    const startDate = new Date(event.start_time)

    return {
      success: true,
      message: `✅ Reunión cancelada: *${event.title}*\nFecha: ${startDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })} a las ${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      data: { deleted_event_id: event_id }
    }
  } catch (error) {
    console.error('Error deleting meeting:', error)
    return {
      success: false,
      error: 'Error al cancelar la reunión.',
    }
  }
}

// Handler: Reschedule a calendar meeting
export async function handleRescheduleMeeting(
  args: { event_id: string; new_start_time: string; new_duration_minutes?: number },
  userId: string
): Promise<FunctionResult> {
  try {
    const { event_id, new_start_time, new_duration_minutes } = args
    const supabase = getServiceClient()

    // Get user timezone
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return {
        success: false,
        error: 'No se pudo obtener tu información de perfil.',
      }
    }

    // Convert new time using user's timezone
    const userTimezone = userProfile.timezone || 'America/Tijuana'
    const newStartTime = fromZonedTime(new_start_time, userTimezone)

    if (isNaN(newStartTime.getTime())) {
      return {
        success: false,
        error: 'Fecha/hora inválida. Usa formato: 2024-02-10T17:00:00',
      }
    }

    // Get existing event
    const { data: event, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time')
      .eq('id', event_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !event) {
      return {
        success: false,
        error: 'No se encontró la reunión o ya fue cancelada.',
      }
    }

    // Calculate new end time
    const oldStartTime = new Date(event.start_time)
    const oldEndTime = new Date(event.end_time)
    const oldDurationMs = oldEndTime.getTime() - oldStartTime.getTime()

    // Use new duration if provided, otherwise keep old duration
    const durationMs = new_duration_minutes
      ? new_duration_minutes * 60 * 1000
      : oldDurationMs

    const newEndTime = new Date(newStartTime.getTime() + durationMs)

    // Update the event
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', event_id)
      .eq('user_id', userId)

    if (updateError) {
      throw updateError
    }

    // Update associated reminder if exists
    const reminderTime = new Date(newStartTime.getTime() - 24 * 60 * 60 * 1000) // 24h before

    const { error: reminderError } = await supabase
      .from('meeting_reminders')
      .update({
        meeting_time: newStartTime.toISOString(),
        scheduled_for: reminderTime.toISOString(),
      })
      .eq('calendar_event_id', event_id)
      .eq('user_id', userId)
      .eq('status', 'pending')

    // Don't fail if reminder doesn't exist
    if (reminderError) {
      console.warn('No reminder found to update:', reminderError)
    }

    return {
      success: true,
      message: `✅ Reunión reprogramada: *${event.title}*\n\n*Nueva fecha:* ${newStartTime.toLocaleDateString('es-MX', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })}\n*Nueva hora:* ${newStartTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${newEndTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      data: {
        event_id,
        new_start_time: newStartTime.toISOString(),
        new_end_time: newEndTime.toISOString()
      }
    }
  } catch (error) {
    console.error('Error rescheduling meeting:', error)
    return {
      success: false,
      error: 'Error al reprogramar la reunión.',
    }
  }
}

// Main function call dispatcher
export async function executeFunctionCall(
  functionName: string,
  args: any,
  userId: string
): Promise<FunctionResult> {
  switch (functionName) {
    case 'search_cases_by_client_name':
      return handleSearchCases(args, userId)

    case 'get_case_balance':
      return handleGetCaseBalance(args, userId)

    case 'add_payment':
      return handleAddPayment(args, userId)

    case 'create_meeting':
      return handleCreateMeeting(args, userId)

    case 'check_client_phone':
      return handleCheckClientPhone(args, userId)

    case 'get_calendar_events':
      return handleGetCalendarEvents(args, userId)

    case 'get_upcoming_reminders':
      return handleGetUpcomingReminders(args, userId)

    case 'delete_meeting':
      return handleDeleteMeeting(args, userId)

    case 'reschedule_meeting':
      return handleRescheduleMeeting(args, userId)

    default:
      return {
        success: false,
        error: `Función desconocida: ${functionName}`,
      }
  }
}

// Execute multiple function calls and return results
export async function executeFunctionCalls(
  functionCalls: any[] | undefined,
  userId: string
): Promise<FunctionResult[]> {
  if (!functionCalls || functionCalls.length === 0) {
    return []
  }

  const results: FunctionResult[] = []

  for (const call of functionCalls) {
    const result = await executeFunctionCall(call.name, call.args, userId)
    results.push(result)
  }

  return results
}
