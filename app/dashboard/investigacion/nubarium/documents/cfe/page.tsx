import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CfeClient } from '@/components/nubarium/cfe-client';

export default async function CfePage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <CfeClient userId={user.id} />;
}
