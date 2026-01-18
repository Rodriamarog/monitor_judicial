import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RepuveClient } from '@/components/nubarium/repuve-client';

export default async function RepuvePage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <RepuveClient userId={user.id} />;
}
