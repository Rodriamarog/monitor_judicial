import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { NombresClient } from '@/components/nombres-client';

export default async function NombresPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's monitored names with alert counts
  const { data: monitoredNames, error } = await supabase
    .from('monitored_names')
    .select(`
      *,
      alerts:alerts!monitored_name_id(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Get user profile for tier limits
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('max_monitored_names, subscription_tier')
    .eq('id', user.id)
    .single();

  const nameCount = monitoredNames?.length || 0;
  const maxNames = profile?.max_monitored_names || 10;

  // Process names to include alert counts
  const namesWithAlerts = monitoredNames?.map((name) => ({
    ...name,
    alert_count: name.alerts?.[0]?.count || 0,
  }));

  const handleDelete = async (nameId: string) => {
    'use server';
    const supabase = await createClient();
    await supabase.from('monitored_names').delete().eq('id', nameId);
    revalidatePath('/dashboard/nombres');
  };

  const handleUpdate = async (
    nameId: string,
    updates: { full_name?: string; search_mode?: string; notes?: string | null }
  ) => {
    'use server';
    const supabase = await createClient();
    await supabase.from('monitored_names').update(updates).eq('id', nameId);
    revalidatePath('/dashboard/nombres');
  };

  return (
    <NombresClient
      namesWithAlerts={namesWithAlerts || []}
      nameCount={nameCount}
      maxNames={maxNames}
      userId={user.id}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  );
}
