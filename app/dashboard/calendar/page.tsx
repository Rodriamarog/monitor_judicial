import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/server/get-effective-tier';
import { hasFeature } from '@/lib/subscription-tiers';
import CalendarContent from './calendar-content';

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tier = await getEffectiveTier(supabase, user.id);
    if (!hasFeature(tier, 'hasCalendar')) {
        redirect('/upgrade?feature=calendario');
    }

    return <CalendarContent />;
}
