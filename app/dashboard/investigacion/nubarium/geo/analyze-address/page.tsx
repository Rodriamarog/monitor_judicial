import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GeoAddressClient } from '@/components/nubarium/geo-address-client';

export default async function GeoAddressPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <GeoAddressClient userId={user.id} />;
}
