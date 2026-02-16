import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase client with service role (admin) privileges
 *
 * CRITICAL SECURITY NOTES:
 * - ONLY use server-side (API routes, server components)
 * - NEVER expose to client-side code
 * - Service role bypasses ALL RLS policies
 * - Only use for admin operations (creating users, forced deletes, etc.)
 *
 * @returns Supabase client with service role privileges
 * @throws Error if environment variables are missing
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase service role configuration. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
