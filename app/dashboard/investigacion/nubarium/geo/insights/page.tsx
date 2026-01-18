import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GeoInsightsClient } from '@/components/nubarium/geo-insights-client';

export default async function GeoInsightsPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <GeoInsightsClient userId={user.id} />;
}
