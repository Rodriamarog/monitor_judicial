import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CurpGenerateClient } from '@/components/nubarium/curp-generate-client';

export default async function CurpGeneratePage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <CurpGenerateClient userId={user.id} />;
}
