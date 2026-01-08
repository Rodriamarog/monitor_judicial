/**
 * Supabase PostgreSQL database connection for Tesis database
 * Migrated from local PostgreSQL to Supabase for production deployment
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Supabase PostgreSQL connection configuration
// Use connection pooler in session mode (supports long-running queries)
// Session mode (port 5432) instead of transaction mode (port 6543) for vector search
const pool = new Pool({
  host: process.env.SUPABASE_TESIS_HOST || 'aws-0-us-east-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_TESIS_PORT || '5432'),
  database: process.env.SUPABASE_TESIS_DB || 'postgres',
  user: process.env.SUPABASE_TESIS_USER || 'postgres.mnotrrzjswisbwkgbyow',
  password: process.env.SUPABASE_TESIS_PASSWORD!,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
  max: 10, // Limit pool size for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
