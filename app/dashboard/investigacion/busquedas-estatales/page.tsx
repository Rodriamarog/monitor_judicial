import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BusquedasEstatalesClient } from '@/components/busquedas-estatales-client';

export default async function BusquedasEstatalesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return <BusquedasEstatalesClient userId={user.id} />;
}
