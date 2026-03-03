/**
 * Server-side helper to get the effective subscription tier for a user.
 * For collaborators, returns the master user's tier.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getEffectiveTier(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, role')
    .eq('id', userId)
    .single();

  if (!profile) return 'gratis';

  if (profile.role === 'collaborator') {
    const { data: collab } = await supabase
      .from('collaborators')
      .select('master_user_id')
      .eq('collaborator_user_id', userId)
      .eq('status', 'active')
      .single();

    if (collab?.master_user_id) {
      const { data: masterProfile } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', collab.master_user_id)
        .single();

      if (masterProfile) {
        return masterProfile.subscription_tier || 'gratis';
      }
    }
  }

  return profile.subscription_tier || 'gratis';
}
