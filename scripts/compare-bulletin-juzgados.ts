/**
 * Compare juzgados from bulletin with what's in our database
 */

import { createClient } from '@/lib/supabase/server'

// Juzgados from the January 6, 2026 Tijuana bulletin
const bulletinJuzgados = [
  'TRIBUNAL LABORAL DE TIJUANA',
  'JUZGADO PRIMERO CIVIL DE TIJUANA',
  'JUZGADO SEGUNDO CIVIL DE TIJUANA',
  'JUZGADO TERCERO CIVIL DE TIJUANA',
  'JUZGADO CUARTO CIVIL DE TIJUANA',
  'JUZGADO QUINTO CIVIL DE TIJUANA',
  'JUZGADO SEXTO CIVIL DE TIJUANA',
  'JUZGADO SEPTIMO CIVIL DE TIJUANA',
  'JUZGADO OCTAVO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA',
  'JUZGADO DECIMO SEGUNDO DE PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO TERCERO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO CUARTO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO QUINTO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO SEXTO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO SEPTIMO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO OCTAVO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO DECIMO NOVENO CIVIL DE TIJUANA',
  'JUZGADO CORPORATIVO VIGESIMO CIVIL DE TIJUANA',
  'JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO SEGUNDO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO TERCERO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO CUARTO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO SEXTO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO SEPTIMO DE LO FAMILIAR DE TIJUANA',
  'JUZGADO OCTAVO DE LO FAMILIAR DE TIJUANA',
]

async function compareBulletinWithDatabase() {
  const supabase = await createClient()

  console.log('='.repeat(80))
  console.log('COMPARING BULLETIN JUZGADOS WITH DATABASE')
  console.log('='.repeat(80))
  console.log()

  // Get Tijuana juzgados from database
  const { data: dbJuzgados, error } = await supabase
    .from('juzgados')
    .select('name, is_active')
    .eq('city', 'Tijuana')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching juzgados from database:', error)
    return
  }

  // Filter to only proper juzgado names (exclude case names, amparos, etc.)
  const dbJuzgadoNames = dbJuzgados
    .filter(j =>
      (j.name.startsWith('JUZGADO') || j.name.startsWith('TRIBUNAL')) &&
      !j.name.includes('VS.') &&
      !j.name.includes('PROMOVIDO') &&
      !j.name.includes('AMPARO') &&
      !j.name.includes('EXHORTO') &&
      !j.name.includes('CUADERNO') &&
      !j.name.includes('REQUISITORIA')
    )
    .map(j => j.name)

  console.log(`📋 Bulletin juzgados: ${bulletinJuzgados.length}`)
  console.log(`💾 Database juzgados (Tijuana, active): ${dbJuzgadoNames.length}`)
  console.log()

  // Find juzgados in bulletin but not in database
  const missingInDb = bulletinJuzgados.filter(bulletin => {
    return !dbJuzgadoNames.some(db => {
      // Try exact match first
      if (db === bulletin) return true

      // Try normalized match (remove ", B.C." suffix variations)
      const normalizedBulletin = bulletin.replace(/, B\.C\.?$/i, '')
      const normalizedDb = db.replace(/, B\.C\.?$/i, '')

      return normalizedDb === normalizedBulletin
    })
  })

  // Find juzgados in database but not in bulletin
  const missingInBulletin = dbJuzgadoNames.filter(db => {
    return !bulletinJuzgados.some(bulletin => {
      // Try exact match first
      if (db === bulletin) return true

      // Try normalized match
      const normalizedBulletin = bulletin.replace(/, B\.C\.?$/i, '')
      const normalizedDb = db.replace(/, B\.C\.?$/i, '')

      return normalizedDb === normalizedBulletin
    })
  })

  // Results
  console.log('✅ MATCHES FOUND')
  console.log('-'.repeat(80))
  const matches = bulletinJuzgados.length - missingInDb.length
  console.log(`${matches} juzgados match between bulletin and database`)
  console.log()

  if (missingInDb.length > 0) {
    console.log('❌ MISSING IN DATABASE (in bulletin, not in our DB)')
    console.log('-'.repeat(80))
    missingInDb.forEach((name, i) => {
      console.log(`${i + 1}. ${name}`)
    })
    console.log()
  } else {
    console.log('✅ All bulletin juzgados are in the database!')
    console.log()
  }

  if (missingInBulletin.length > 0) {
    console.log('⚠️  MISSING IN BULLETIN (in our DB, not in bulletin)')
    console.log('-'.repeat(80))
    missingInBulletin.forEach((name, i) => {
      console.log(`${i + 1}. ${name}`)
    })
    console.log()
  }

  // Summary
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`✅ Matches: ${matches}`)
  console.log(`❌ Missing in DB: ${missingInDb.length}`)
  console.log(`⚠️  Extra in DB (not in bulletin): ${missingInBulletin.length}`)
  console.log()

  if (missingInDb.length === 0 && missingInBulletin.length === 0) {
    console.log('🎉 Perfect match! Database is in sync with the bulletin.')
  } else if (missingInDb.length > 0) {
    console.log('⚠️  Action required: Update database to add missing juzgados')
  } else if (missingInBulletin.length > 0) {
    console.log('ℹ️  Note: Database has extra juzgados (possibly from other bulletins or renamed courts)')
  }
  console.log()
}

compareBulletinWithDatabase()
