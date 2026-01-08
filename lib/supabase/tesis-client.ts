import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for tesis database RPC calls
 *
 * This client bypasses the connection pooler for vector search operations.
 * The pooler (pgBouncer) doesn't support pgvector HNSW index operations,
 * causing sequential scans instead of index scans (117+ seconds vs <1 second).
 *
 * By using RPC, we make HTTPS API calls that go directly to PostgreSQL,
 * preserving all vector index optimizations.
 */
export const supabaseTesis = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
