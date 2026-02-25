import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotificationLogger } from '@/lib/notification-logger';

/**
 * DELETE /api/collaborators/invitations/[id]
 * Cancel a pending invitation
 */
export async function DELETE(
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
      logger.warn('Invitation not found for cancel', undefined, { invitation_id: invitationId });
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('collaborator_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (updateError) {
      logger.invitationError('DB update failed on cancel', invitation.invitation_token, {
        db_error: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }

    logger.invitationInfo('Cancelled by owner', invitation.invitation_token, {
      invitation_id: invitationId,
    });

    return NextResponse.json({ success: true });
  } finally {
    await logger.flush();
  }
}
