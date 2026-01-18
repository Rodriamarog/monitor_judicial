import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SatGetNameClient } from '@/components/nubarium/sat-get-name-client';

export default async function SatGetNamePage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <SatGetNameClient userId={user.id} />;
}
