import { createClient } from '@supabase/supabase-js'
import { normalizeName } from './name-variations'

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
