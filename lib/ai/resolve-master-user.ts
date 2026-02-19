import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the master user ID for billing/quota purposes.
 * If the given user is a collaborator, returns their master's user ID.
 * Otherwise returns the user's own ID.
 */
export async function resolveMasterUserId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'collaborator') return userId

  const { data: collab } = await supabase
    .from('collaborators')
    .select('master_user_id')
    .eq('collaborator_user_id', userId)
    .eq('status', 'active')
    .single()

  return collab?.master_user_id ?? userId
}
