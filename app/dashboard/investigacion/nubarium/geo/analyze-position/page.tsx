import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GeoPositionClient } from '@/components/nubarium/geo-position-client';

export default async function GeoPositionPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <GeoPositionClient userId={user.id} />;
}
