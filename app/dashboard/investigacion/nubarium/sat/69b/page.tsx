import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sat69bClient } from '@/components/nubarium/sat-69b-client';

export default async function Sat69bPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <Sat69bClient userId={user.id} />;
}
