import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CurpValidateClient } from '@/components/nubarium/curp-validate-client';

export default async function CurpValidatePage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <CurpValidateClient userId={user.id} />;
}
