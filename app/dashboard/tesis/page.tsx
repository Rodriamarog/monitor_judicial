import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/server/get-effective-tier';
import { hasFeature } from '@/lib/subscription-tiers';
import TesisContent from './tesis-content';

export default async function TesisPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tier = await getEffectiveTier(supabase, user.id);
    if (!hasFeature(tier, 'hasTesis')) {
        redirect('/upgrade?feature=tesis');
    }

    return <TesisContent />;
}
