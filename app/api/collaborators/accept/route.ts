import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationLogger } from '@/lib/notification-logger';

/**
 * GET /api/collaborators/accept?token=XXX&action=accept|reject
 * Public route for accepting/rejecting invitations
 */
export async function GET(request: NextRequest) {
  const logger = createNotificationLogger(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const token = searchParams.get('token');
  const action = searchParams.get('action');

  // Validate parameters
  if (!token) {
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=invalid', request.url)
    );
  }

  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=invalid', request.url)
    );
  }

  // Find invitation by token (using service role to bypass RLS for public access)
  const { data: invitation, error: fetchError } = await supabase
    .from('collaborator_invitations')
    .select('*')
    .eq('invitation_token', token)
    .single();

  if (fetchError || !invitation) {
    logger.warn('Token not found or fetch error', undefined, { token, error: fetchError?.message });
    await logger.flush();
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=invalid', request.url)
    );
  }

  // Check if invitation is expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Update status to expired
    await supabase
      .from('collaborator_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);

    logger.invitationWarn('Invitation expired', token, { invitation_id: invitation.id });
    await logger.flush();
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=expired', request.url)
    );
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    logger.invitationWarn('Invitation already responded', token, { status: invitation.status });
    await logger.flush();
    return NextResponse.redirect(
      new URL(`/collaborator/invitation-response?status=${invitation.status}`, request.url)
    );
  }

  // Process action
  if (action === 'accept') {
    try {
      const serviceSupabase = createServiceClient();

      // Check if user exists with this email
      const { data: existingUsers, error: listError } = await serviceSupabase.auth.admin.listUsers();

      if (listError) {
        logger.invitationError('listUsers auth error', token, { error: listError.message });
        await logger.flush();
        return NextResponse.redirect(
          new URL('/collaborator/invitation-response?status=error', request.url)
        );
      }

      const existingUser = existingUsers.users.find(u => u.email === invitation.collaborator_email);

      // Update invitation status first
      await serviceSupabase
        .from('collaborator_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (!existingUser) {
        // NEW USER: Redirect to password setup page
        logger.invitationInfo('New user, redirecting to setup-password', token, {
          collaborator_email: invitation.collaborator_email,
        });
        await logger.flush();

        const setupUrl = new URL('/collaborator/setup-password', request.url);
        setupUrl.searchParams.set('token', token!);
        setupUrl.searchParams.set('email', invitation.collaborator_email);

        return NextResponse.redirect(setupUrl);
      }

      // EXISTING USER: Create collaborator relationship directly
      const collaboratorUserId = existingUser.id;

      // Create collaborator relationship
      const { error: collabError } = await serviceSupabase
        .from('collaborators')
        .insert({
          master_user_id: invitation.owner_id,
          collaborator_user_id: collaboratorUserId,
          collaborator_email: invitation.collaborator_email,
          status: 'active',
        });

      if (collabError) {
        logger.invitationError('Failed to create collaborator relationship', token, {
          db_error: collabError.message,
        });
        await logger.flush();
        return NextResponse.redirect(
          new URL('/collaborator/invitation-response?status=error', request.url)
        );
      }

      // Add email to owner's collaborator_emails (for backward compatibility)
      const { data: ownerProfile } = await serviceSupabase
        .from('user_profiles')
        .select('collaborator_emails')
        .eq('id', invitation.owner_id)
        .single();

      if (ownerProfile) {
        const currentEmails = ownerProfile.collaborator_emails || [];
        const updatedEmails = Array.from(new Set([...currentEmails, invitation.collaborator_email]));

        await serviceSupabase
          .from('user_profiles')
          .update({ collaborator_emails: updatedEmails })
          .eq('id', invitation.owner_id);
      }

      logger.invitationInfo('Existing user linked as collaborator', token, {
        collaborator_user_id: collaboratorUserId,
      });
      await logger.flush();

      // Redirect to success page for existing users
      const redirectUrl = new URL('/collaborator/invitation-response', request.url);
      redirectUrl.searchParams.set('status', 'accepted');
      redirectUrl.searchParams.set('new', 'false');
      redirectUrl.searchParams.set('email', invitation.collaborator_email);

      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      logger.invitationError('Unexpected error during acceptance', token, {
        error: error instanceof Error ? error.message : String(error),
      });
      await logger.flush();
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }
  } else {
    // Reject invitation
    const { error: updateError } = await supabase
      .from('collaborator_invitations')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      logger.invitationError('Reject DB update failed', token, { db_error: updateError.message });
      await logger.flush();
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }

    logger.invitationInfo('Invitation rejected', token);
    await logger.flush();

    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=rejected', request.url)
    );
  }
}

/**
 * Generate a secure random password for new collaborator accounts
 * @returns A 16-character random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}
