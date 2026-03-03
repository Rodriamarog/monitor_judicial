import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/server/get-effective-tier';
import { hasFeature } from '@/lib/subscription-tiers';
import { TemplateContent } from './template-content';

export default async function TemplatePage({
    params,
}: {
    params: Promise<{ templateId: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tier = await getEffectiveTier(supabase, user.id);
    if (!hasFeature(tier, 'hasTemplates')) {
        redirect('/upgrade?feature=machotes');
    }

    const { templateId } = await params;

    return <TemplateContent templateId={templateId} />;
}
