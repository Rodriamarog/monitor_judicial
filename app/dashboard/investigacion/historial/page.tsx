import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportHistoryClient } from '@/components/report-history-client';

export default async function ReportHistoryPage() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return <ReportHistoryClient userId={user.id} />;
}
