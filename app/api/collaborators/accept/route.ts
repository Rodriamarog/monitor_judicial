import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/collaborators/accept?token=XXX&action=accept|reject
 * Public route for accepting/rejecting invitations
 */
export async function GET(request: NextRequest) {
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

    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=expired', request.url)
    );
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    return NextResponse.redirect(
      new URL(`/collaborator/invitation-response?status=${invitation.status}`, request.url)
    );
  }

  // Process action
  if (action === 'accept') {
    // Add email to owner's collaborator_emails
    const { data: ownerProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('collaborator_emails')
      .eq('id', invitation.owner_id)
      .single();

    if (profileError || !ownerProfile) {
      console.error('Error fetching owner profile:', profileError);
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }

    const currentEmails = ownerProfile.collaborator_emails || [];
    const updatedEmails = Array.from(new Set([...currentEmails, invitation.collaborator_email]));

    // Update owner's collaborator_emails
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({ collaborator_emails: updatedEmails })
      .eq('id', invitation.owner_id);

    if (updateProfileError) {
      console.error('Error updating owner profile:', updateProfileError);
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }

    // Update invitation status
    const { error: updateInvitationError } = await supabase
      .from('collaborator_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateInvitationError) {
      console.error('Error updating invitation:', updateInvitationError);
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }

    console.log(`[Collaborators] Invitation accepted: ${invitation.collaborator_email}`);

    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=accepted', request.url)
    );
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
      console.error('Error updating invitation:', updateError);
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }

    console.log(`[Collaborators] Invitation rejected: ${invitation.collaborator_email}`);

    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=rejected', request.url)
    );
  }
}
