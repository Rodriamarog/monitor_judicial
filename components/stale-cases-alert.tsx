'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface StaleCasesAlertProps {
  staleCaseCount: number
}

export function StaleCasesAlert({ staleCaseCount }: StaleCasesAlertProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || staleCaseCount === 0) return null

  return (
    <Alert variant="default" className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="flex items-center justify-between text-yellow-800 dark:text-yellow-200">
        <span>Casos sin Actualizaciones</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2 text-yellow-700 dark:text-yellow-300">
        <p>
          Tienes <strong>{staleCaseCount}</strong> caso{staleCaseCount > 1 ? 's' : ''} sin
          apariciones en boletines por más de 60 días.
          {staleCaseCount > 1 ? ' Están marcados' : ' Está marcado'} con ⚠️ en la lista de casos.
        </p>
        <p className="mt-2 text-sm">
          Considera revisar si aún necesitas monitorear {staleCaseCount > 1 ? 'estos casos' : 'este caso'}.
        </p>
      </AlertDescription>
    </Alert>
  )
}
