import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTierConfig } from '@/lib/subscription-tiers'

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
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { cases: importedCases } = body

    if (!Array.isArray(importedCases)) {
      return NextResponse.json(
        { error: 'El formato del JSON es inválido' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: 'Error al validar juzgados' },
        { status: 500 }
      )
    }

    const validJuzgadoNames = new Set(juzgados?.map((j) => j.name) || [])

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

    // PHASE 1: Validate all cases first (don't insert yet)
    for (let i = 0; i < importedCases.length; i++) {
      const importedCase = importedCases[i] as ImportedCase

      // Validate required fields
      if (!importedCase.Expediente || !importedCase.Juzgado) {
        result.failed++
        result.errors.push(
          `Caso ${i + 1}: Falta expediente o juzgado`
        )
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

      // Validate juzgado exists in database
      if (!validJuzgadoNames.has(importedCase.Juzgado)) {
        result.failed++

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
        continue
      }

      // Check for duplicates
      const key = `${normalizedCaseNumber}|${importedCase.Juzgado}`
      if (existingSet.has(key)) {
        result.skipped++
        result.errors.push(
          `Caso ${i + 1} (${normalizedCaseNumber}): Ya existe`
        )
        continue
      }

      // Add to insert queue
      casesToInsert.push({
        user_id: user.id,
        case_number: normalizedCaseNumber,
        juzgado: importedCase.Juzgado,
        nombre: importedCase.Nombre || null,
      })

      // Mark as existing to avoid duplicates within the import batch
      existingSet.add(key)
    }

    // PHASE 2: Check if all valid cases fit within tier limits
    if (casesToInsert.length > availableSlots) {
      return NextResponse.json(
        {
          error: `No se puede importar. Intentas importar ${casesToInsert.length} caso${casesToInsert.length > 1 ? 's' : ''} pero solo tienes ${availableSlots} espacio${availableSlots !== 1 ? 's' : ''} disponible${availableSlots !== 1 ? 's' : ''}. Tu plan permite ${maxCases} casos y actualmente tienes ${currentCount}. ${casesToInsert.length > 0 ? 'Actualiza tu plan o elimina algunos casos existentes.' : ''}`,
        },
        { status: 400 }
      )
    }

    // PHASE 3: Bulk insert (all or nothing)
    if (casesToInsert.length > 0) {
      const { data: insertedCases, error: insertError } = await supabase
        .from('monitored_cases')
        .insert(casesToInsert)
        .select()

      if (insertError) {
        console.error('Bulk insert error:', insertError)
        return NextResponse.json(
          { error: 'Error al insertar casos: ' + insertError.message },
          { status: 500 }
        )
      }

      result.success = insertedCases?.length || 0

      // For each inserted case, check historical bulletins
      // We'll do this asynchronously without blocking the response
      if (insertedCases && insertedCases.length > 0) {
        // Fire and forget - check history in the background
        Promise.all(
          insertedCases.map((insertedCase) =>
            fetch(
              `${request.nextUrl.origin}/api/check-history`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  monitored_case_id: insertedCase.id,
                  case_number: insertedCase.case_number,
                  juzgado: insertedCase.juzgado,
                }),
              }
            ).catch((err) => {
              console.error('History check error:', err)
            })
          )
        ).catch((err) => {
          console.error('History check batch error:', err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
