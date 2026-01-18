import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SatCfdiClient } from '@/components/nubarium/sat-cfdi-client';

export default async function SatCfdiPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <SatCfdiClient userId={user.id} />;
}
