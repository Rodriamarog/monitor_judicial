import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UpgradeClient } from './upgrade-client'

export default async function UpgradePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for current tier
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single()

  const currentTier = profile?.subscription_tier || 'free'

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Actualiza tu Plan</h1>
        <p className="text-lg text-muted-foreground">
          Monitorea más casos y obtén acceso a funciones premium
        </p>
      </div>

      <UpgradeClient currentTier={currentTier} />
    </div>
  )
}
