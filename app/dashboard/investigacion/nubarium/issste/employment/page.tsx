import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IssssteEmploymentClient } from '@/components/nubarium/issste-employment-client';

export default async function IssssteEmploymentPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <IssssteEmploymentClient userId={user.id} />;
}
