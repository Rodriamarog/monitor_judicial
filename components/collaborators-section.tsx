'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Mail, AlertCircle, Send, RefreshCw, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { getMaxCollaborators, getTierConfig } from '@/lib/subscription-tiers'
import { toast } from 'sonner'

interface Collaborator {
  email: string
}

interface Invitation {
  id: string
  collaborator_email: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  created_at: string
  expires_at: string
  responded_at?: string
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
  const [loading, setLoading] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)

  const maxCollaborators = getMaxCollaborators(tier)
  const tierConfig = getTierConfig(tier)

  // Count accepted collaborators
  const acceptedCount = invitations.filter(inv => inv.status === 'accepted').length

  // Don't show section if tier doesn't allow collaborators
  if (maxCollaborators === 0) {
    return null
  }

  // Fetch invitations on mount
  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/collaborators/invitations')
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (err) {
      console.error('Error fetching invitations:', err)
      toast.error('Error al cargar invitaciones')
    } finally {
      setLoadingInvitations(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSendInvitation = async () => {
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
      setError('No puedes invitarte a ti mismo')
      return
    }

    // Check tier limit
    if (acceptedCount >= maxCollaborators) {
      setError(`Tu plan solo permite ${maxCollaborators} colaborador${maxCollaborators > 1 ? 'es' : ''}`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/collaborators/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar invitación')
      }

      toast.success('Invitación enviada correctamente')
      setNewEmail('')
      await fetchInvitations()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al enviar invitación'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      const response = await fetch(`/api/collaborators/invitations/${invitationId}/resend`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al reenviar invitación')
      }

      toast.success(`Invitación reenviada a ${email}`)
      await fetchInvitations()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al reenviar invitación'
      toast.error(errorMsg)
    }
  }

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`¿Cancelar invitación a ${email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/collaborators/invitations/${invitationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al cancelar invitación')
      }

      toast.success('Invitación cancelada')
      await fetchInvitations()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cancelar invitación'
      toast.error(errorMsg)
    }
  }

  const handleRemoveCollaborator = async (email: string) => {
    if (!confirm(`¿Eliminar a ${email} como colaborador? Esto también lo eliminará de todos los casos y nombres asignados.`)) {
      return
    }

    try {
      console.log('[CollaboratorsSection] Removing collaborator:', email)

      // Call the API endpoint to properly remove collaborator
      const response = await fetch('/api/collaborators/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      console.log('[CollaboratorsSection] API response status:', response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error('[CollaboratorsSection] API error:', data)
        throw new Error(data.error || 'Error al eliminar colaborador')
      }

      const result = await response.json()
      console.log('[CollaboratorsSection] API success:', result)

      toast.success('Colaborador eliminado exitosamente')

      // Reload the page to refresh all collaborator data
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error('[CollaboratorsSection] Error removing collaborator:', err)
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar colaborador'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const getStatusBadge = (status: Invitation['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Aceptado</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><Clock className="h-3 w-3 mr-1" />Expirado</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>
    }
  }

  const getDaysUntilExpiration = (expiresAt: string): number => {
    const now = new Date()
    const expiration = new Date(expiresAt)
    const diffTime = expiration.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const activeCollaborators = invitations.filter(inv => inv.status === 'accepted')
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Tier Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Tu plan <span className="font-semibold text-foreground">{tierConfig.displayName}</span> permite{' '}
          <span className="font-semibold text-foreground">
            {maxCollaborators} colaborador{maxCollaborators > 1 ? 'es' : ''} adicional{maxCollaborators > 1 ? 'es' : ''}
          </span>
        </span>
        <span className="font-medium">
          {acceptedCount}/{maxCollaborators} activos
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Collaborators */}
      {activeCollaborators.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Colaboradores Activos ({activeCollaborators.length})</h4>
          </div>
          <div className="space-y-2">
            {activeCollaborators.map((invitation) => (
              <Card key={invitation.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{invitation.collaborator_email}</span>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aceptado el {new Date(invitation.responded_at!).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveCollaborator(invitation.collaborator_email)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Invitaciones Pendientes ({pendingInvitations.length})</h4>
          </div>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => {
              const daysLeft = getDaysUntilExpiration(invitation.expires_at)
              return (
                <Card key={invitation.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{invitation.collaborator_email}</span>
                          {getStatusBadge(invitation.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {daysLeft > 0 ? `Expira en ${daysLeft} día${daysLeft > 1 ? 's' : ''}` : 'Expirada'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(invitation.id, invitation.collaborator_email)}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reenviar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id, invitation.collaborator_email)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Send New Invitation Form */}
      {acceptedCount < maxCollaborators && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Enviar Nueva Invitación</h4>
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="collab-email">Email del colaborador</Label>
              <Input
                id="collab-email"
                type="email"
                placeholder="colaborador@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendInvitation()
                  }
                }}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                El colaborador recibirá un email con un enlace para aceptar o rechazar la invitación
              </p>
            </div>

            <Button
              onClick={handleSendInvitation}
              disabled={loading || !newEmail.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </div>
        </div>
      )}

      {/* At Limit Message */}
      {acceptedCount >= maxCollaborators && (
        <Alert>
          <AlertDescription>
            Has alcanzado el límite de colaboradores para tu plan. Actualiza tu suscripción para agregar más.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
