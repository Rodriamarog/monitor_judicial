import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/server/get-effective-tier';
import { hasFeature } from '@/lib/subscription-tiers';
import AIAssistantContent from './ai-assistant-content';

export default async function AIAssistantPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tier = await getEffectiveTier(supabase, user.id);
    if (!hasFeature(tier, 'hasAIAssistant')) {
        redirect('/upgrade?feature=asistente-ia');
    }

    return <AIAssistantContent />;
}
