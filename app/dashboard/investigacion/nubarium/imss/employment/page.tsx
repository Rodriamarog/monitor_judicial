import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ImssEmploymentClient } from '@/components/nubarium/imss-employment-client';

export default async function ImssEmploymentPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');
    return <ImssEmploymentClient userId={user.id} />;
}
