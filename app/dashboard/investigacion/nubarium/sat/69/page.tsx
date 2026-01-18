import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sat69Client } from '@/components/nubarium/sat-69-client';

export default async function Sat69Page() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <Sat69Client userId={user.id} />;
}
