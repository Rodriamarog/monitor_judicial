import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * DELETE /api/collaborators/remove
 * Remove a collaborator and clean up all their assignments
 *
 * Body: { email: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get collaborator email from request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Update invitation status to 'cancelled' (so it doesn't show in UI anymore)
    const { error: updateInvitationError } = await serviceSupabase
      .from('collaborator_invitations')
      .update({ status: 'cancelled' })
      .eq('owner_id', user.id)
      .eq('collaborator_email', email)
      .eq('status', 'accepted');

    if (updateInvitationError) {
      console.error('[API] Error updating invitation status:', updateInvitationError);
      // Don't fail the entire operation
    }

    // Delete from collaborators table (requires service role because of cascading operations)
    const { error: deleteCollabError } = await serviceSupabase
      .from('collaborators')
      .delete()
      .eq('master_user_id', user.id)
      .eq('collaborator_email', email);

    if (deleteCollabError) {
      console.error('[API] Error deleting from collaborators table:', deleteCollabError);
      return NextResponse.json(
        { error: 'Failed to remove collaborator' },
        { status: 500 }
      );
    }

    // Remove from user_profiles.collaborator_emails array (for backward compatibility)
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('collaborator_emails')
      .eq('id', user.id)
      .single();

    if (profile && profile.collaborator_emails) {
      const updatedEmails = profile.collaborator_emails.filter(
        (e: string) => e !== email
      );

      const { error: updateProfileError } = await serviceSupabase
        .from('user_profiles')
        .update({ collaborator_emails: updatedEmails })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('[API] Error updating user profile:', updateProfileError);
        // Don't fail the entire operation if this fails
      }
    }

    // Remove from all case and name assignments using the RPC function
    const { error: rpcError } = await serviceSupabase.rpc(
      'remove_collaborator_from_assignments',
      {
        p_user_id: user.id,
        p_email: email,
      }
    );

    if (rpcError) {
      console.error('[API] Error removing assignments:', rpcError);
      // Don't fail - the collaborator relationship is already deleted
    }

    console.log(`[API] Successfully removed collaborator: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Collaborator removed successfully',
    });
  } catch (error) {
    console.error('[API] Unexpected error in remove collaborator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
