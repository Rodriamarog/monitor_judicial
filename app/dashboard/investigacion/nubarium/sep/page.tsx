import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SepClient } from '@/components/nubarium/sep-client';

export default async function SepPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <SepClient userId={user.id} />;
}
