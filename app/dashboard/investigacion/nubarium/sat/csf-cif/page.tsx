import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SatCsfCifClient } from '@/components/nubarium/sat-csf-cif-client';

export default async function SatCsfCifPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <SatCsfCifClient userId={user.id} />;
}
