import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SatRfcClient } from '@/components/nubarium/sat-rfc-client';

export default async function SatRfcPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <SatRfcClient userId={user.id} />;
}
