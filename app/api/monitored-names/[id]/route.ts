import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE: Remove a monitored name
 * RLS policies ensure users can only delete their own monitored names
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete (RLS ensures user can only delete their own)
  const { error } = await supabase
    .from('monitored_names')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting monitored name:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Monitored Names] Deleted name ${params.id} for user ${user.id}`);

  return NextResponse.json({ success: true });
}
