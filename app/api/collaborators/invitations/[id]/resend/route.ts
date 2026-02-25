import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCollaboratorInvitation } from '@/lib/email';
import { createNotificationLogger } from '@/lib/notification-logger';

/**
 * POST /api/collaborators/invitations/[id]/resend
 * Resend an invitation email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createNotificationLogger(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invitationId } = await params;

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('collaborator_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !invitation) {
      logger.warn('Invitation not found for resend', undefined, { invitation_id: invitationId });
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if invitation can be resent
    if (invitation.status === 'accepted') {
      logger.invitationWarn('Cannot resend accepted invitation', invitation.invitation_token);
      return NextResponse.json(
        { error: 'Cannot resend accepted invitation' },
        { status: 400 }
      );
    }

    if (invitation.status === 'rejected') {
      logger.invitationWarn('Cannot resend rejected invitation', invitation.invitation_token);
      return NextResponse.json(
        { error: 'Cannot resend rejected invitation. Create a new one instead.' },
        { status: 400 }
      );
    }

    // Update invitation with new expiration
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('collaborator_invitations')
      .update({
        status: 'pending',
        expires_at: newExpiresAt,
        created_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateError) {
      logger.invitationError('DB update failed on resend', invitation.invitation_token, {
        db_error: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    // Get owner profile for email
    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 });
    }

    // Resend invitation email
    const emailResult = await sendCollaboratorInvitation({
      ownerEmail: ownerProfile.email,
      ownerName: ownerProfile.full_name || undefined,
      collaboratorEmail: invitation.collaborator_email,
      invitationToken: invitation.invitation_token,
      expiresAt: newExpiresAt,
    });

    if (!emailResult.success) {
      logger.invitationError('Email delivery failed on resend', invitation.invitation_token, {
        email_error: emailResult.error,
      });
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    logger.invitationInfo('Resent successfully', invitation.invitation_token, {
      resend_message_id: emailResult.messageId,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.collaborator_email,
        status: 'pending',
        expires_at: newExpiresAt,
      },
    });
  } finally {
    await logger.flush();
  }
}
