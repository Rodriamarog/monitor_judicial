import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PepsClient } from '@/components/nubarium/peps-client';

export default async function PepsPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <PepsClient userId={user.id} />;
}
