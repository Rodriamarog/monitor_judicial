import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SatValidateSerialClient } from '@/components/nubarium/sat-validate-serial-client';

export default async function SatValidateSerialPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <SatValidateSerialClient userId={user.id} />;
}
