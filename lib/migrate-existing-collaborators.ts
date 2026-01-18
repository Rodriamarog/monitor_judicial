/**
 * Migration Script: Auto-accept Existing Collaborators
 *
 * This script creates 'accepted' invitation records for all existing collaborators
 * to maintain backward compatibility and avoid disrupting current workflows.
 *
 * Run this ONCE after deploying the collaborator_invitations table.
 */

import { createClient } from '@supabase/supabase-js';

export async function migrateExistingCollaborators(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  success: boolean;
  totalUsers: number;
  totalCollaborators: number;
  invitationsCreated: number;
  errors: string[];
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const result = {
    success: true,
    totalUsers: 0,
    totalCollaborators: 0,
    invitationsCreated: 0,
    errors: [] as string[],
  };

  console.log('[Migration] Starting migration of existing collaborators...');

  try {
    // Get all users with collaborators
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, collaborator_emails')
      .not('collaborator_emails', 'is', null);

    if (profilesError) {
      console.error('[Migration] Error fetching profiles:', profilesError);
      result.errors.push(`Failed to fetch profiles: ${profilesError.message}`);
      result.success = false;
      return result;
    }

    if (!profiles || profiles.length === 0) {
      console.log('[Migration] No users with collaborators found');
      return result;
    }

    result.totalUsers = profiles.length;
    console.log(`[Migration] Found ${result.totalUsers} users with collaborators`);

    // Process each user
    for (const profile of profiles) {
      const collaboratorEmails = profile.collaborator_emails as string[] | null;

      if (!collaboratorEmails || collaboratorEmails.length === 0) {
        continue;
      }

      console.log(`[Migration] Processing user ${profile.id} with ${collaboratorEmails.length} collaborators`);
      result.totalCollaborators += collaboratorEmails.length;

      // Create accepted invitation for each collaborator
      for (const email of collaboratorEmails) {
        try {
          const { error: insertError } = await supabase
            .from('collaborator_invitations')
            .insert({
              owner_id: profile.id,
              collaborator_email: email,
              status: 'accepted',
              responded_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year (not relevant for accepted)
            });

          if (insertError) {
            // Ignore duplicate errors (invitation already exists)
            if (insertError.code === '23505') {
              console.log(`[Migration] Invitation already exists for ${email} (user ${profile.id})`);
            } else {
              console.error(`[Migration] Error creating invitation for ${email}:`, insertError);
              result.errors.push(`User ${profile.id}, Email ${email}: ${insertError.message}`);
            }
          } else {
            result.invitationsCreated++;
            console.log(`[Migration] Created accepted invitation for ${email}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[Migration] Exception for ${email}:`, err);
          result.errors.push(`User ${profile.id}, Email ${email}: ${errorMsg}`);
        }
      }
    }

    console.log(`[Migration] Completed!`);
    console.log(`[Migration] Total users: ${result.totalUsers}`);
    console.log(`[Migration] Total collaborators: ${result.totalCollaborators}`);
    console.log(`[Migration] Invitations created: ${result.invitationsCreated}`);
    console.log(`[Migration] Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      result.success = false;
      console.log(`[Migration] Errors encountered:`);
      result.errors.forEach(err => console.log(`  - ${err}`));
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Migration] Fatal error:', error);
    result.errors.push(`Fatal: ${errorMsg}`);
    result.success = false;
  }

  return result;
}

// CLI execution
if (require.main === module) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  migrateExistingCollaborators(supabaseUrl, supabaseKey)
    .then(result => {
      console.log('\n=== Migration Result ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
