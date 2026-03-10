'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreditCard, Sparkles, Loader2, ArrowUpCircle } from 'lucide-react'

interface SubscriptionButtonProps {
  tier: string
  hasStripeCustomer: boolean
}

export function SubscriptionButton({ tier, hasStripeCustomer }: SubscriptionButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const isFreeTier = tier === 'gratis' || tier === 'Gratis'
  const isMaxTier = tier === 'max' || tier === 'Max'

  const handleManageClick = async () => {
    setIsLoading(true)

    if (isFreeTier) {
      router.push('/upgrade')
      return
    }

    if (hasStripeCustomer) {
      try {
        const response = await fetch('/api/stripe/create-portal-session', {
          method: 'POST',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || 'Failed to create portal session')
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
      router.push('/upgrade')
    }
  }

  if (isFreeTier) {
    return (
      <Button
        variant="default"
        size="sm"
        className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer"
        onClick={handleManageClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{isLoading ? 'Cargando...' : 'Actualizar Plan'}</span>
        <span className="sm:hidden">Upgrade</span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {!isMaxTier && (
        <Button
          variant="default"
          size="sm"
          className="gap-2 cursor-pointer"
          onClick={() => router.push('/upgrade')}
        >
          <ArrowUpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Mejorar Suscripción</span>
          <span className="sm:hidden">Mejorar</span>
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 cursor-pointer"
        onClick={handleManageClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{isLoading ? 'Cargando...' : 'Cancelar Suscripción'}</span>
        <span className="sm:hidden">Cancelar</span>
      </Button>
    </div>
  )
}
