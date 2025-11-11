'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface DowngradeBlockedAlertProps {
  caseCount: number
  maxCasesForNewTier: number
  targetTier: string
}

export function DowngradeBlockedAlert({
  caseCount,
  maxCasesForNewTier,
  targetTier,
}: DowngradeBlockedAlertProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const casesToRemove = caseCount - maxCasesForNewTier

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Cambio de Plan Bloqueado</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          Intentaste cambiar al plan <strong>{targetTier}</strong>, pero tienes{' '}
          <strong>{caseCount} casos monitoreados</strong> y el límite del nuevo plan es de{' '}
          <strong>{maxCasesForNewTier} casos</strong>.
        </p>
        <p className="font-semibold">
          Para cambiar a un plan menor, primero elimina {casesToRemove} caso
          {casesToRemove > 1 ? 's' : ''} de tu lista de monitoreo.
        </p>
      </AlertDescription>
    </Alert>
  )
}
