/**
 * Local PostgreSQL client for tesis database
 * Connects to the local MJ_TesisYJurisprudencias database
 * where embeddings are stored
 */

import { Pool } from 'pg';

// Create connection pool for local tesis database
export const localTesisPool = new Pool({
  host: process.env.TESIS_DB_HOST || 'localhost',
  port: parseInt(process.env.TESIS_DB_PORT || '5432'),
  database: process.env.TESIS_DB_NAME || 'legal_rag',
  user: process.env.TESIS_DB_USER || 'rodrigo',
  password: process.env.TESIS_DB_PASSWORD || 'rodrigo',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
localTesisPool.on('error', (err) => {
  console.error('[Local Tesis DB] Unexpected error on idle client', err);
});

// Export query helper
export async function queryLocalTesis<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await localTesisPool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[Local Tesis DB] Query executed in ${duration}ms`);
    return result.rows;
  } catch (error) {
    console.error('[Local Tesis DB] Query error:', error);
    throw error;
  }
}
