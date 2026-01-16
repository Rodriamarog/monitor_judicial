import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTierConfig } from '@/lib/subscription-tiers'
import { checkHistoricalMatchesBatch } from '@/lib/matcher'

interface ImportedCase {
  Nombre?: string
  Expediente: string
  Juzgado: string
  Fecha?: string
}

interface ImportResult {
  total: number
  success: number
  failed: number
  skipped: number
  errors: string[]
}

// Normalize case number to 5 digits / 4 digits format
function normalizeCaseNumber(input: string): string | null {
  // Remove any whitespace
  const cleaned = input.trim()

  // Match pattern: 1-5 digits, slash, exactly 4 digits
  const match = cleaned.match(/^(\d{1,5})\/(\d{4})$/)
  if (!match) {
    return null
  }

  const [, caseNum, year] = match
  // Pad case number to 5 digits with leading zeros
  const paddedCaseNum = caseNum.padStart(5, '0')
  return `${paddedCaseNum}/${year}`
}

// Find similar juzgado names (simple substring matching)
function findSimilarJuzgados(input: string, validNames: Set<string>): string[] {
  const inputUpper = input.toUpperCase()
  const similar: string[] = []

  for (const name of validNames) {
    const nameUpper = name.toUpperCase()

    // Check if input is a substring of valid name or vice versa
    if (nameUpper.includes(inputUpper) || inputUpper.includes(nameUpper)) {
      similar.push(name)
      if (similar.length >= 3) break // Limit to 3 suggestions
    }
  }

  return similar
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send progress updates
      const sendProgress = (data: any) => {
        const json = JSON.stringify(data) + '\n'
        controller.enqueue(encoder.encode(json))
      }

      try {
        const supabase = await createClient()

        // Check authentication
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          sendProgress({ type: 'error', error: 'No autenticado' })
          controller.close()
          return
        }

        // Parse request body
        const body = await request.json()
        const { cases: importedCases } = body

        if (!Array.isArray(importedCases)) {
          sendProgress({ type: 'error', error: 'El formato del JSON es inválido' })
          controller.close()
          return
        }

        // === PHASE 1: VALIDATION ===
        sendProgress({
          type: 'phase',
          phase: 'validation',
          message: 'Validando casos...',
          total: importedCases.length,
        })

        // Get user's current case count and tier
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()

        const tierConfig = getTierConfig(profile?.subscription_tier)
        const maxCases = tierConfig.maxCases

        const { count: currentCount } = await supabase
          .from('monitored_cases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const availableSlots = maxCases - (currentCount || 0)

        // Get existing cases to check for duplicates
        const { data: existingCases } = await supabase
          .from('monitored_cases')
          .select('case_number, juzgado')
          .eq('user_id', user.id)

        const existingSet = new Set(
          existingCases?.map((c) => `${c.case_number}|${c.juzgado}`) || []
        )

        // Get all valid juzgado names from the database
        const { data: juzgados, error: juzgadosError } = await supabase
          .from('juzgados')
          .select('name')

        if (juzgadosError) {
          console.error('Error fetching juzgados:', juzgadosError)
          sendProgress({ type: 'error', error: 'Error al validar juzgados' })
          controller.close()
          return
        }

        const validJuzgadoNames = new Set(juzgados?.map((j) => j.name) || [])

        // Get all aliases and map them to their canonical names
        const { data: aliases, error: aliasesError } = await supabase
          .from('juzgado_aliases')
          .select('alias, canonical_name')

        if (aliasesError) {
          console.error('Error fetching aliases:', aliasesError)
          // Non-critical, continue with just valid names
        }

        const aliasMap = new Map<string, string>(
          aliases?.map((a) => [a.alias.toUpperCase(), a.canonical_name]) || []
        )

        // Process cases
        const result: ImportResult = {
          total: importedCases.length,
          success: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        }

        const casesToInsert: Array<{
          user_id: string
          case_number: string
          juzgado: string
          nombre: string | null
        }> = []

        // Validate all cases first (don't insert yet)
        for (let i = 0; i < importedCases.length; i++) {
          const importedCase = importedCases[i] as ImportedCase

          // Send validation progress every 10 cases or at end
          if (i % 10 === 0 || i === importedCases.length - 1) {
            sendProgress({
              type: 'validation_progress',
              current: i + 1,
              total: importedCases.length,
              validated: i + 1,
              failed: result.failed,
              skipped: result.skipped,
            })
          }

          // Validate required fields
          if (!importedCase.Expediente || !importedCase.Juzgado) {
            result.failed++
            result.errors.push(`Caso ${i + 1}: Falta expediente o juzgado`)
            continue
          }

          // Normalize case number
          const normalizedCaseNumber = normalizeCaseNumber(importedCase.Expediente)
          if (!normalizedCaseNumber) {
            result.failed++
            result.errors.push(
              `Caso ${i + 1} (${importedCase.Expediente}): Formato de expediente inválido`
            )
            continue
          }

          // Validate juzgado exists in database (check canonical names first, then aliases)
          let finalJuzgadoName = importedCase.Juzgado
          const importedJuzgadoUpper = importedCase.Juzgado.toUpperCase()

          if (validJuzgadoNames.has(importedCase.Juzgado)) {
            // Exact match in canonical table
            finalJuzgadoName = importedCase.Juzgado
          } else if (aliasMap.has(importedJuzgadoUpper)) {
            // Match in aliases table
            finalJuzgadoName = aliasMap.get(importedJuzgadoUpper)!
          } else {
            result.failed++

            // Check if it's a SALA (higher court) case
            const isSala = importedCase.Juzgado.toUpperCase().includes('SALA')

            if (isSala) {
              // Special message for SALA cases
              result.errors.push(
                `Caso ${i + 1} (${normalizedCaseNumber}): Juzgado "${importedCase.Juzgado}" no encontrado. Múltiples estados tienen Tribunal Superior y "Salas". Favor de agregar caso manualmente para verificar que se agregue al Tribunal Superior Estatal correcto.`
              )
            } else {
              // Find similar juzgado names to help the user
              const similarJuzgados = findSimilarJuzgados(
                importedCase.Juzgado,
                validJuzgadoNames
              )

              let errorMsg = `Caso ${i + 1} (${normalizedCaseNumber}): Juzgado "${importedCase.Juzgado}" no encontrado en la base de datos.`

              if (similarJuzgados.length > 0) {
                errorMsg += ` ¿Quiso decir: ${similarJuzgados.join(', ')}?`
              } else {
                errorMsg += ` Verifique el nombre exacto o agrégalo manualmente.`
              }

              result.errors.push(errorMsg)
            }
            continue
          }

          // Check for duplicates
          const key = `${normalizedCaseNumber}|${finalJuzgadoName}`
          if (existingSet.has(key)) {
            result.skipped++
            result.errors.push(`Caso ${i + 1} (${normalizedCaseNumber}): Ya existe`)
            continue
          }

          // Add to insert queue
          casesToInsert.push({
            user_id: user.id,
            case_number: normalizedCaseNumber,
            juzgado: finalJuzgadoName,
            nombre: importedCase.Nombre || null,
          })

          // Mark as existing to avoid duplicates within the import batch
          existingSet.add(key)
        }

        // Check if all valid cases fit within tier limits
        if (casesToInsert.length > availableSlots) {
          sendProgress({
            type: 'error',
            error: `No se puede importar. Intentas importar ${casesToInsert.length} caso${casesToInsert.length > 1 ? 's' : ''} pero solo tienes ${availableSlots} espacio${availableSlots !== 1 ? 's' : ''} disponible${availableSlots !== 1 ? 's' : ''}. Tu plan permite ${maxCases} casos y actualmente tienes ${currentCount}. ${casesToInsert.length > 0 ? 'Actualiza tu plan o elimina algunos casos existentes.' : ''}`,
          })
          controller.close()
          return
        }

        // === PHASE 2: INSERTION ===
        sendProgress({
          type: 'phase',
          phase: 'insertion',
          message: `Insertando ${casesToInsert.length} casos...`,
          total: casesToInsert.length,
        })

        if (casesToInsert.length === 0) {
          sendProgress({
            type: 'complete',
            result: {
              total: importedCases.length,
              success: 0,
              failed: result.failed,
              skipped: result.skipped,
              errors: result.errors,
              totalMatches: 0,
              totalAlerts: 0,
            },
          })
          controller.close()
          return
        }

        const { data: insertedCases, error: insertError } = await supabase
          .from('monitored_cases')
          .insert(casesToInsert)
          .select()

        if (insertError) {
          console.error('Bulk insert error:', insertError)
          sendProgress({
            type: 'error',
            error: 'Error al insertar casos: ' + insertError.message,
          })
          controller.close()
          return
        }

        result.success = insertedCases?.length || 0

        sendProgress({
          type: 'insertion_complete',
          inserted: result.success,
        })

        // === PHASE 3: HISTORICAL MATCHING ===
        sendProgress({
          type: 'phase',
          phase: 'matching',
          message: 'Buscando coincidencias en archivo histórico (20 años)...',
          total: insertedCases.length,
        })

        // Prepare cases for batch matching
        const casesForMatching = insertedCases.map((c) => ({
          userId: user.id,
          monitoredCaseId: c.id,
          caseNumber: c.case_number,
          juzgado: c.juzgado,
        }))

        // Call batch matching with progress callback
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const matchResults = await checkHistoricalMatchesBatch(
          casesForMatching,
          'all', // Search entire 20-year archive
          supabaseUrl,
          supabaseKey,
          (progress) => {
            sendProgress({
              type: 'matching_progress',
              phase: progress.phase,
              current: progress.caseIndex + 1,
              total: progress.totalCases,
              caseNumber: progress.caseNumber,
              juzgado: progress.juzgado,
              matchesFound: progress.matchesFound,
              alertsCreated: progress.alertsCreated,
            })
          }
        )

        // === COMPLETION ===
        sendProgress({
          type: 'complete',
          result: {
            total: importedCases.length,
            success: result.success,
            failed: result.failed,
            skipped: result.skipped,
            errors: result.errors,
            totalMatches: matchResults.totalMatchesFound,
            totalAlerts: matchResults.totalAlertsCreated,
          },
        })

        controller.close()
      } catch (error) {
        console.error('Import error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error inesperado'
        const json = JSON.stringify({ type: 'error', error: errorMessage }) + '\n'
        controller.enqueue(encoder.encode(json))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
