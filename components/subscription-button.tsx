'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreditCard, Sparkles, Loader2 } from 'lucide-react'

interface SubscriptionButtonProps {
  tier: string
  hasStripeCustomer: boolean
}

export function SubscriptionButton({ tier, hasStripeCustomer }: SubscriptionButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)

    // If user has no subscription (free tier), redirect to upgrade page
    if (tier === 'free') {
      router.push('/upgrade')
      return
    }

    // If user has active subscription, open customer portal
    if (hasStripeCustomer) {
      try {
        const response = await fetch('/api/stripe/create-portal-session', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to create portal session')
        }

        const { url } = await response.json()

        if (url) {
          window.location.href = url
        }
      } catch (error) {
        console.error('Portal error:', error)
        setIsLoading(false)
      }
    } else {
      // User has a paid tier in database but no Stripe customer
      // This shouldn't happen, but redirect to upgrade page as fallback
      router.push('/upgrade')
    }
  }

  return (
    <Button
      variant={tier === 'free' ? 'default' : 'outline'}
      size="sm"
      className={tier === 'free'
        ? "gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer"
        : "gap-2 cursor-pointer"
      }
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Cargando...</span>
        </>
      ) : tier === 'free' ? (
        <>
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Actualizar Plan</span>
          <span className="sm:hidden">Upgrade</span>
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          <span className="hidden sm:inline">Mi Suscripción</span>
          <span className="sm:hidden">Cuenta</span>
        </>
      )}
    </Button>
  )
}
