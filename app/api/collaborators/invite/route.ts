import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMaxCollaborators } from '@/lib/subscription-tiers';
import { sendCollaboratorInvitation } from '@/lib/email';

/**
 * POST /api/collaborators/invite
 * Send a collaborator invitation
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request
  const body = await request.json();
  const { email } = body;

  // Validate email
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Prevent self-invitation
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('email, subscription_tier, collaborator_emails, full_name')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  if (normalizedEmail === userProfile.email.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
  }

  // Check subscription tier limit
  const maxCollaborators = getMaxCollaborators(userProfile.subscription_tier);

  if (maxCollaborators === 0) {
    return NextResponse.json(
      { error: 'Your plan does not allow collaborators. Please upgrade.' },
      { status: 403 }
    );
  }

  // Count accepted collaborators
  const { count: acceptedCount } = await supabase
    .from('collaborator_invitations')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('status', 'accepted');

  if (acceptedCount !== null && acceptedCount >= maxCollaborators) {
    return NextResponse.json(
      { error: `You have reached the limit of ${maxCollaborators} collaborators for your plan` },
      { status: 400 }
    );
  }

  // Check if invitation already exists
  const { data: existingInvitation } = await supabase
    .from('collaborator_invitations')
    .select('*')
    .eq('owner_id', user.id)
    .eq('collaborator_email', normalizedEmail)
    .single();

  if (existingInvitation) {
    if (existingInvitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This email is already an active collaborator' },
        { status: 400 }
      );
    }

    // If pending, expired, rejected, or cancelled - update and resend
    if (['pending', 'expired', 'rejected', 'cancelled'].includes(existingInvitation.status)) {
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('collaborator_invitations')
        .update({
          status: 'pending',
          expires_at: newExpiresAt,
          created_at: new Date().toISOString(),
          responded_at: null, // Clear previous response
        })
        .eq('id', existingInvitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
      }

      // Resend email
      const emailResult = await sendCollaboratorInvitation({
        ownerEmail: userProfile.email,
        ownerName: userProfile.full_name || undefined,
        collaboratorEmail: normalizedEmail,
        invitationToken: existingInvitation.invitation_token,
        expiresAt: newExpiresAt,
      });

      if (!emailResult.success) {
        console.error('Failed to send invitation email:', emailResult.error);
        return NextResponse.json(
          { error: 'Invitation updated but email failed to send' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        invitation: {
          id: existingInvitation.id,
          email: normalizedEmail,
          status: 'pending',
          expires_at: newExpiresAt,
        },
      });
    }
  }

  // Create new invitation
  const { data: invitation, error: createError } = await supabase
    .from('collaborator_invitations')
    .insert({
      owner_id: user.id,
      collaborator_email: normalizedEmail,
      status: 'pending',
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating invitation:', createError);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }

  // Send invitation email
  const emailResult = await sendCollaboratorInvitation({
    ownerEmail: userProfile.email,
    ownerName: userProfile.full_name || undefined,
    collaboratorEmail: normalizedEmail,
    invitationToken: invitation.invitation_token,
    expiresAt: invitation.expires_at,
  });

  if (!emailResult.success) {
    console.error('Failed to send invitation email:', emailResult.error);
    // Delete the invitation since email failed
    await supabase
      .from('collaborator_invitations')
      .delete()
      .eq('id', invitation.id);

    return NextResponse.json(
      { error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }

  console.log(`[Collaborators] Invitation sent from ${user.id} to ${normalizedEmail}`);

  return NextResponse.json({
    success: true,
    invitation: {
      id: invitation.id,
      email: normalizedEmail,
      status: 'pending',
      expires_at: invitation.expires_at,
    },
  });
}
