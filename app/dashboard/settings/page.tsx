'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SubscriptionButton } from '@/components/subscription-button'
import { CollaboratorsSection } from '@/components/collaborators-section'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [scopeValid, setScopeValid] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [calendarSuccess, setCalendarSuccess] = useState(false)
  const [tier, setTier] = useState('free')
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [collaborators, setCollaborators] = useState<Array<{email: string}>>([])
  const [collaboratorsSaving, setCollaboratorsSaving] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()

    // Check for OAuth callback success/error
    const googleConnected = searchParams?.get('google_connected')
    const googleError = searchParams?.get('google_error')

    if (googleConnected === 'true') {
      setCalendarSuccess(true)
      setTimeout(() => setCalendarSuccess(false), 5000)
      router.replace('/dashboard/settings')
    }

    if (googleError) {
      setError(`Error de Google: ${googleError}`)
      setTimeout(() => setError(null), 5000)
      router.replace('/dashboard/settings')
    }
  }, [searchParams])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('email, phone, whatsapp_enabled, email_notifications_enabled, subscription_tier, stripe_customer_id, collaborator_emails')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setUserEmail(profile.email || user.email || '')
      setPhone(profile.phone || '')
      setWhatsappEnabled(profile.whatsapp_enabled || false)
      setEmailEnabled(profile.email_notifications_enabled !== false)
      setTier(profile.subscription_tier || 'free')
      setHasStripeCustomer(!!profile.stripe_customer_id)

      // Parse collaborators from JSONB array (email only)
      const emails = profile.collaborator_emails || []
      const collabList = emails.map((email: string) => ({ email }))
      setCollaborators(collabList)

      // Check unified Google (Calendar + Drive) status
      const googleStatus = await fetch('/api/google/status')
      const googleData = await googleStatus.json()
      setGoogleConnected(googleData.connected || false)
      setScopeValid(googleData.scope_valid || false)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Error al cargar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // If enabling WhatsApp, validate phone number
      if (whatsappEnabled && !phone) {
        setError('Debe ingresar un número de WhatsApp')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          phone: phone || null,
          whatsapp_enabled: whatsappEnabled,
          email_notifications_enabled: emailEnabled,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectGoogle = async () => {
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/google/connect')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate OAuth')
      }

      // Redirect to Google OAuth
      window.location.href = data.url
    } catch (err) {
      console.error('Error connecting Google:', err)
      setError(err instanceof Error ? err.message : 'Error al conectar Google')
      setConnecting(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('¿Estás seguro de que quieres desconectar Google Drive? Ya no podrás subir documentos directamente.')) {
      return
    }

    setDisconnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      setGoogleConnected(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error disconnecting Google:', err)
      setError(err instanceof Error ? err.message : 'Error al desconectar Google')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleCollaboratorsUpdate = async (newCollaborators: Array<{email: string}>) => {
    setCollaboratorsSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Convert to JSONB array (email only)
      const collaboratorEmails = newCollaborators.map(c => c.email)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          collaborator_emails: collaboratorEmails,
          collaborator_phones: [], // Clear phones since we're email-only now
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setCollaborators(newCollaborators)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating collaborators:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar colaboradores')
      throw err // Propagate error to component
    } finally {
      setCollaboratorsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Suscripción</CardTitle>
          <CardDescription>
            Administra tu plan de suscripción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Plan actual</p>
                <p className="text-2xl font-bold capitalize">{tier}</p>
              </div>
              <SubscriptionButton tier={tier} hasStripeCustomer={hasStripeCustomer} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Notificaciones</CardTitle>
          <CardDescription>
            Administra cómo recibes alertas de tus casos monitoreados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-amber-50 border-amber-500 dark:bg-amber-950 dark:border-amber-700">
                <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-900 dark:text-amber-100 font-semibold text-base">
                  ✓ Configuración guardada exitosamente
                </AlertDescription>
              </Alert>
            )}

            {calendarSuccess && (
              <Alert className="bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-900 dark:text-green-100 font-semibold text-base">
                  ✓ Google Drive conectado exitosamente
                </AlertDescription>
              </Alert>
            )}

            {/* Email Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-toggle" className="text-base">
                    Notificaciones por Email
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe alertas en tu correo electrónico cuando tus casos aparezcan en los boletines
                  </p>
                </div>
                <Switch
                  id="email-toggle"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>
            </div>

            {/* WhatsApp Toggle */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="whatsapp-toggle" className="text-base">
                    Notificaciones por WhatsApp
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe alertas instantáneas cuando tus casos aparezcan en los boletines
                  </p>
                </div>
                <Switch
                  id="whatsapp-toggle"
                  checked={whatsappEnabled}
                  onCheckedChange={setWhatsappEnabled}
                />
              </div>

              {whatsappEnabled && (
                <div className="pl-4 border-l-2 border-primary space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Número de WhatsApp</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+52 664 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={whatsappEnabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: +52 seguido de tu número (10 dígitos)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Google Drive Integration */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Integración con Google Drive
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sube y edita documentos directamente en Google Drive
                  </p>
                </div>
                <Badge variant={googleConnected && scopeValid ? "default" : "secondary"}>
                  {googleConnected && scopeValid ? "Conectado" : "Desconectado"}
                </Badge>
              </div>

              {!scopeValid && googleConnected && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Reautorización requerida</AlertTitle>
                  <AlertDescription>
                    Por favor reconecta tu cuenta de Google para actualizar permisos.
                  </AlertDescription>
                </Alert>
              )}

              {!googleConnected || !scopeValid ? (
                <div className="pl-4 border-l-2 border-muted space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Conecta tu cuenta de Google para subir y editar documentos directamente en Google Drive.
                  </p>
                  <Button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                    variant="outline"
                    className="w-full"
                  >
                    {connecting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Conectando...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{googleConnected ? 'Reconectar' : 'Conectar'} Google Drive</span>
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="pl-4 border-l-2 border-primary space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm">
                      <p className="font-semibold">✓ Conectado a Google Drive</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ✓ Subida y edición de documentos habilitada
                      </p>
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    disabled={disconnecting}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    {disconnecting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Desconectando...</span>
                      </span>
                    ) : (
                      'Desconectar Google Drive'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Usa "Abrir en Google Docs" en las plantillas para subir y editar documentos directamente en Google Drive.
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Guardando...</span>
                </span>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Collaborators Card */}
      <Card>
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
          <CardDescription>
            Agrega colaboradores que recibirán alertas por email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollaboratorsSection
            tier={tier}
            userEmail={userEmail}
            collaborators={collaborators}
            onUpdate={handleCollaboratorsUpdate}
          />
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
