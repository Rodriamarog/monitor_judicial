import { normalizeJuzgado } from '../lib/normalize-juzgado';

const testCases = [
  {
    input: "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA, B.C. LISTA (BOLETIN) DEL",
    expected: "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA"
  },
  {
    input: "JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA, B.C. LISTA",
    expected: "JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA"
  },
  {
    input: "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI, DEL",
    expected: "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI"
  },
  {
    input: "JUZGADO CIVIL DE PLAYAS DE ROSARITO, B.C.",
    expected: "JUZGADO CIVIL DE PLAYAS DE ROSARITO"
  },
  {
    input: "JUZGADO PRIMERO CIVIL DE MEXICALI",
    expected: "JUZGADO PRIMERO CIVIL DE MEXICALI"
  },
  {
    input: "JUZGADO MIXTO DE SAN QUINTIN, DEL",
    expected: "JUZGADO MIXTO DE SAN QUINTIN"
  },
];

console.log('Testing normalization function...\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = normalizeJuzgado(test.input);
  const success = result === test.expected;

  if (success) {
    console.log('✓ PASS');
    passed++;
  } else {
    console.log('✗ FAIL');
    console.log('  Input:    ' + test.input);
    console.log('  Expected: ' + test.expected);
    console.log('  Got:      ' + result);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
