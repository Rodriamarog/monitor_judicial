/**
 * Local PostgreSQL database connection for Tesis database
 * This is separate from Supabase and connects to the local MJ_TesisYJurisprudencias database
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Local PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.TESIS_DB_HOST || 'localhost',
  port: parseInt(process.env.TESIS_DB_PORT || '5432'),
  database: process.env.TESIS_DB_NAME || 'MJ_TesisYJurisprudencias',
  user: process.env.TESIS_DB_USER || 'postgres',
  password: process.env.TESIS_DB_PASSWORD || 'admin',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on initialization (only in development)
if (process.env.NODE_ENV === 'development') {
  pool.query('SELECT NOW()')
    .then(() => console.log('✓ Connected to local Tesis database'))
    .catch((err) => console.error('✗ Tesis database connection error:', err));
}

/**
 * Execute a query on the Tesis database
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Close the pool (useful for cleanup in tests)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default {
  query,
  getClient,
  closePool,
};
