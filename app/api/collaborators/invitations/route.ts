import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/collaborators/invitations
 * List all invitations sent by the authenticated user
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch invitations
  const { data: invitations, error } = await supabase
    .from('collaborator_invitations')
    .select('id, collaborator_email, status, created_at, expires_at, responded_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }

  // Update expired invitations
  const now = new Date();
  const expiredInvitations = (invitations || []).filter(
    inv => inv.status === 'pending' && new Date(inv.expires_at) < now
  );

  if (expiredInvitations.length > 0) {
    await supabase
      .from('collaborator_invitations')
      .update({ status: 'expired' })
      .in('id', expiredInvitations.map(inv => inv.id));

    // Update the local array
    expiredInvitations.forEach(inv => {
      inv.status = 'expired';
    });
  }

  return NextResponse.json({ invitations: invitations || [] });
}
