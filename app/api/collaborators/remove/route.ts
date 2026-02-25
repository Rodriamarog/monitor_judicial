import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationLogger } from '@/lib/notification-logger';

/**
 * DELETE /api/collaborators/remove
 * Remove a collaborator and clean up all their assignments
 *
 * Body: { email: string }
 */
export async function DELETE(request: NextRequest) {
  const logger = createNotificationLogger(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

    logger.info('Collaborator removal initiated', undefined, { email, owner_id: user.id });

    // Update invitation status to 'cancelled' (so it doesn't show in UI anymore)
    const { error: updateInvitationError } = await serviceSupabase
      .from('collaborator_invitations')
      .update({ status: 'cancelled' })
      .eq('owner_id', user.id)
      .eq('collaborator_email', email)
      .eq('status', 'accepted');

    if (updateInvitationError) {
      logger.warn('Invitation cancel failed (non-fatal)', undefined, {
        error: updateInvitationError.message,
        email,
      });
    }

    // Delete from collaborators table (requires service role because of cascading operations)
    const { error: deleteCollabError } = await serviceSupabase
      .from('collaborators')
      .delete()
      .eq('master_user_id', user.id)
      .eq('collaborator_email', email);

    if (deleteCollabError) {
      logger.error('Collaborator table delete failed', undefined, {
        error: deleteCollabError.message,
        email,
      });
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
        // Non-fatal: don't block the removal
        console.error('[API] Error updating user profile:', updateProfileError);
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
      logger.warn('RPC assignments cleanup failed (non-fatal)', undefined, {
        error: rpcError.message,
        email,
      });
    }

    logger.info('Collaborator removed successfully', undefined, { email, owner_id: user.id });

    return NextResponse.json({
      success: true,
      message: 'Collaborator removed successfully',
    });
  } catch (error) {
    logger.error('Unexpected error in remove collaborator', undefined, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await logger.flush();
  }
}
