#!/usr/bin/env node
/**
 * Migration Script: Export embeddings from local postgres → Import to Docker postgres
 *
 * Usage:
 *   node scripts/migrate-embeddings-to-docker.js
 *
 * Requirements:
 *   - Local postgres running with legal_rag database
 *   - Docker postgres container running (docker compose -f docker-compose.local.yml up -d)
 *   - LOCAL_POSTGRES_PASSWORD env var set
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI colors for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.cyan}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    warn: `${colors.yellow}[WARN]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
  }[level] || '[LOG]';

  console.log(`${timestamp} ${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function getRowCount(client, table) {
  const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
  return parseInt(result.rows[0].count);
}

async function exportEmbeddings(sourceClient, batchSize = 1000) {
  log('info', 'Starting export from local postgres...');

  const totalCount = await getRowCount(sourceClient, 'tesis_embeddings');
  log('info', `Found ${totalCount.toLocaleString()} tesis to export`);

  const exportDir = path.join(__dirname, '../postgres/export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  let offset = 0;
  let batchNum = 0;
  const exportFiles = [];

  while (offset < totalCount) {
    batchNum++;
    log('info', `Exporting batch ${batchNum} (rows ${offset + 1}-${Math.min(offset + batchSize, totalCount)})`);

    const result = await sourceClient.query(`
      SELECT
        id_tesis,
        rubro,
        texto,
        tipo_tesis,
        epoca,
        instancia,
        anio,
        materias,
        rubro_embedding::text as rubro_embedding,
        texto_embedding::text as texto_embedding
      FROM tesis_embeddings
      ORDER BY id_tesis
      LIMIT $1 OFFSET $2
    `, [batchSize, offset]);

    const filename = `batch_${batchNum.toString().padStart(4, '0')}.json`;
    const filepath = path.join(exportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result.rows, null, 2));
    exportFiles.push(filename);

    log('success', `Batch ${batchNum} exported to ${filename} (${result.rows.length} rows)`);

    offset += batchSize;
  }

  // Write manifest
  const manifest = {
    exportDate: new Date().toISOString(),
    totalRows: totalCount,
    batchSize,
    batches: exportFiles.length,
    files: exportFiles,
  };

  fs.writeFileSync(
    path.join(exportDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  log('success', `Export complete! ${exportFiles.length} batches exported to ${exportDir}`);
  return manifest;
}

async function importEmbeddings(targetClient, manifest) {
  log('info', 'Starting import to Docker postgres...');

  const exportDir = path.join(__dirname, '../postgres/export');
  let totalImported = 0;

  for (let i = 0; i < manifest.files.length; i++) {
    const filename = manifest.files[i];
    const filepath = path.join(exportDir, filename);

    log('info', `Importing batch ${i + 1}/${manifest.files.length}: ${filename}`);

    const batch = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    // Prepare batch insert
    const values = batch.map(row => [
      row.id_tesis,
      row.rubro,
      row.texto,
      row.tipo_tesis,
      row.epoca,
      row.instancia,
      row.anio,
      row.materias,
      row.rubro_embedding,
      row.texto_embedding,
    ]);

    // Use parameterized query for safety
    const placeholders = values.map((_, idx) => {
      const base = idx * 10;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}::vector, $${base + 10}::vector)`;
    }).join(',');

    const flatValues = values.flat();

    await targetClient.query(`
      INSERT INTO tesis_embeddings (
        id_tesis, rubro, texto, tipo_tesis, epoca, instancia, anio, materias,
        rubro_embedding, texto_embedding
      ) VALUES ${placeholders}
      ON CONFLICT (id_tesis) DO UPDATE SET
        rubro = EXCLUDED.rubro,
        texto = EXCLUDED.texto,
        tipo_tesis = EXCLUDED.tipo_tesis,
        epoca = EXCLUDED.epoca,
        instancia = EXCLUDED.instancia,
        anio = EXCLUDED.anio,
        materias = EXCLUDED.materias,
        rubro_embedding = EXCLUDED.rubro_embedding,
        texto_embedding = EXCLUDED.texto_embedding,
        updated_at = NOW()
    `, flatValues);

    totalImported += batch.length;
    log('success', `Batch ${i + 1} imported (${totalImported.toLocaleString()}/${manifest.totalRows.toLocaleString()} total)`);
  }

  log('success', `Import complete! ${totalImported.toLocaleString()} rows imported`);
}

async function createVectorIndexes(client) {
  log('info', 'Creating HNSW vector indexes (this may take several minutes)...');

  const rowCount = await getRowCount(client, 'tesis_embeddings');

  // HNSW parameters:
  // m = 16 (connections per layer, higher = better recall but more memory)
  // ef_construction = 64 (build quality, higher = better index but slower build)
  log('info', `Creating HNSW indexes for ${rowCount.toLocaleString()} rows`);
  log('info', 'Parameters: m=16, ef_construction=64 (optimized for recall)');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_tesis_rubro_embedding
    ON tesis_embeddings
    USING hnsw (rubro_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `);
  log('success', 'rubro_embedding HNSW index created');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_tesis_texto_embedding
    ON tesis_embeddings
    USING hnsw (texto_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `);
  log('success', 'texto_embedding HNSW index created');

  log('success', 'All HNSW indexes created!');
}

async function validateMigration(sourceClient, targetClient) {
  log('info', 'Validating migration...');

  const sourceCount = await getRowCount(sourceClient, 'tesis_embeddings');
  const targetCount = await getRowCount(targetClient, 'tesis_embeddings');

  log('info', `Source rows: ${sourceCount.toLocaleString()}`);
  log('info', `Target rows: ${targetCount.toLocaleString()}`);

  if (sourceCount === targetCount) {
    log('success', '✓ Row counts match!');
  } else {
    log('error', `✗ Row count mismatch! Source: ${sourceCount}, Target: ${targetCount}`);
    throw new Error('Migration validation failed');
  }

  // Validate embeddings
  const validation = await targetClient.query('SELECT * FROM validate_embeddings()');
  console.log('\nEmbedding Validation:');
  validation.rows.forEach(row => {
    const status = row.status === 'PASS'
      ? `${colors.green}${row.status}${colors.reset}`
      : row.status === 'WARN'
      ? `${colors.yellow}${row.status}${colors.reset}`
      : `${colors.red}${row.status}${colors.reset}`;
    console.log(`  ${row.check_name}: ${status} - ${row.details}`);
  });

  log('success', 'Migration validated successfully!');
}

async function main() {
  console.log(`${colors.bright}=== Legal RAG Database Migration ===${colors.reset}\n`);

  const localPassword = process.env.LOCAL_POSTGRES_PASSWORD || 'rodrigo';

  // Connect to source (local postgres)
  log('info', 'Connecting to source database (local postgres)...');
  const sourceClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'legal_rag',
    user: 'rodrigo',
    password: localPassword,
  });

  // Connect to target (Docker postgres)
  log('info', 'Connecting to target database (Docker postgres)...');
  const targetClient = new Client({
    host: 'localhost',
    port: 5433,  // Docker-mapped port
    database: 'legal_rag',
    user: 'postgres',
    password: process.env.LOCAL_POSTGRES_PASSWORD || 'postgres',
  });

  try {
    await sourceClient.connect();
    log('success', 'Connected to source database');

    await targetClient.connect();
    log('success', 'Connected to target database');

    // Step 1: Export
    const manifest = await exportEmbeddings(sourceClient);

    // Step 2: Import
    await importEmbeddings(targetClient, manifest);

    // Step 3: Create indexes
    await createVectorIndexes(targetClient);

    // Step 4: Validate
    await validateMigration(sourceClient, targetClient);

    console.log(`\n${colors.bright}${colors.green}Migration completed successfully!${colors.reset}\n`);
    console.log('Next steps:');
    console.log('  1. Update .env.local to point to Docker postgres (port 5433)');
    console.log('  2. Test vector search queries');
    console.log('  3. Update lib/db/local-tesis-client.ts to use new connection');

  } catch (error) {
    log('error', 'Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main();
