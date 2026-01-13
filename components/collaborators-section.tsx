'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { X, Mail, AlertCircle } from 'lucide-react'
import { getMaxCollaborators, getTierConfig } from '@/lib/subscription-tiers'

interface Collaborator {
  email: string
}

interface CollaboratorsSectionProps {
  tier: string
  userEmail: string
  collaborators: Collaborator[]
  onUpdate: (collaborators: Collaborator[]) => Promise<void>
}

export function CollaboratorsSection({
  tier,
  userEmail,
  collaborators,
  onUpdate,
}: CollaboratorsSectionProps) {
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const maxCollaborators = getMaxCollaborators(tier)
  const tierConfig = getTierConfig(tier)
  const currentCount = collaborators.length

  // Don't show section if tier doesn't allow collaborators
  if (maxCollaborators === 0) {
    return null
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleAdd = async () => {
    setError(null)

    // Validate email format
    if (!newEmail.trim()) {
      setError('El email es requerido')
      return
    }

    if (!validateEmail(newEmail)) {
      setError('Formato de email inválido')
      return
    }

    // Check if email is the same as user's email
    if (newEmail.toLowerCase() === userEmail.toLowerCase()) {
      setError('No puedes agregar tu propio email como colaborador')
      return
    }

    // Check for duplicate email
    if (collaborators.some(c => c.email.toLowerCase() === newEmail.toLowerCase())) {
      setError('Este email ya está agregado')
      return
    }

    // Check tier limit
    if (currentCount >= maxCollaborators) {
      setError(`Tu plan solo permite ${maxCollaborators} colaborador${maxCollaborators > 1 ? 'es' : ''}`)
      return
    }

    setAdding(true)
    try {
      const newCollaborators = [
        ...collaborators,
        {
          email: newEmail.trim(),
        },
      ]
      await onUpdate(newCollaborators)

      // Clear form
      setNewEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar colaborador')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (email: string) => {
    try {
      const newCollaborators = collaborators.filter(c => c.email !== email)
      await onUpdate(newCollaborators)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar colaborador')
    }
  }

  return (
    <div className="space-y-4">
      {/* Tier Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Tu plan <span className="font-semibold text-foreground">{tierConfig.displayName}</span> permite{' '}
          <span className="font-semibold text-foreground">
            {maxCollaborators} colaborador{maxCollaborators > 1 ? 'es' : ''} adicional{maxCollaborators > 1 ? 'es' : ''}
          </span>
        </span>
        <span className="font-medium">
          {currentCount}/{maxCollaborators} en uso
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Existing Collaborators List */}
      {collaborators.length > 0 && (
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <Card key={collaborator.email} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{collaborator.email}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemove(collaborator.email)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Collaborator Form */}
      {currentCount < maxCollaborators && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="space-y-2">
            <Label htmlFor="collab-email">Email del colaborador</Label>
            <Input
              id="collab-email"
              type="email"
              placeholder="colaborador@ejemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={adding}
            />
            <p className="text-xs text-muted-foreground">
              Los colaboradores recibirán alertas por email únicamente
            </p>
          </div>

          <Button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="w-full"
          >
            {adding ? 'Agregando...' : 'Agregar Colaborador'}
          </Button>
        </div>
      )}

      {/* At Limit Message */}
      {currentCount >= maxCollaborators && (
        <Alert>
          <AlertDescription>
            Has alcanzado el límite de colaboradores para tu plan. Actualiza tu suscripción para agregar más.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
