import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SatValidateInfoClient } from '@/components/nubarium/sat-validate-info-client';

export default async function SatValidateInfoPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <SatValidateInfoClient userId={user.id} />;
}
