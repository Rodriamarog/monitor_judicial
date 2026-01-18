import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/collaborators/invitations/[id]
 * Cancel a pending invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  // Update status to cancelled
  const { error: updateError } = await supabase
    .from('collaborator_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (updateError) {
    console.error('Error cancelling invitation:', updateError);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }

  console.log(`[Collaborators] Invitation cancelled: ${invitationId}`);

  return NextResponse.json({ success: true });
}
