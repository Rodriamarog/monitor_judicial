import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CurpClient } from '@/components/nubarium/curp-client';

export default async function CurpPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <CurpClient userId={user.id} />;
}
