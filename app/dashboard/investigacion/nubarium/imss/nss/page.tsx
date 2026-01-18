import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ImssNssClient } from '@/components/nubarium/imss-nss-client';

export default async function ImssNssPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <ImssNssClient userId={user.id} />;
}
