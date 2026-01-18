import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CepClient } from '@/components/nubarium/cep-client';

export default async function CepPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <CepClient userId={user.id} />;
}
