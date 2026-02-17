'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertTriangle, FileText, Trash2, RefreshCw, Upload, File, X, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SubscriptionButton } from '@/components/subscription-button'
import { CollaboratorsSection } from '@/components/collaborators-section'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useUserRole } from '@/lib/hooks/use-user-role'

export default function SettingsPage() {
  const { isCollaborator, loading: roleLoading } = useUserRole()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [timezone, setTimezone] = useState('America/Tijuana')
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
  const [tribunalStatus, setTribunalStatus] = useState<{
    hasCredentials: boolean
    lastSyncAt: string | null
  }>({ hasCredentials: false, lastSyncAt: null })
  const [tribunalStatusLoading, setTribunalStatusLoading] = useState(true)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isUpdateMode, setIsUpdateMode] = useState(false)
  const [tribunalEmail, setTribunalEmail] = useState('')
  const [tribunalPassword, setTribunalPassword] = useState('')
  const [tribunalKeyFile, setTribunalKeyFile] = useState<File | null>(null)
  const [tribunalCerFile, setTribunalCerFile] = useState<File | null>(null)
  const [tribunalSaving, setTribunalSaving] = useState(false)
  const [tribunalDeleting, setTribunalDeleting] = useState(false)
  const [tribunalValidationProgress, setTribunalValidationProgress] = useState('')

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
        .select('email, phone, whatsapp_enabled, email_notifications_enabled, timezone, subscription_tier, stripe_customer_id, collaborator_emails, role')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setUserEmail(profile.email || user.email || '')
      setPhone(profile.phone || '')
      setWhatsappEnabled(profile.whatsapp_enabled || false)
      setEmailEnabled(profile.email_notifications_enabled !== false)
      setTimezone(profile.timezone || 'America/Tijuana')
      setHasStripeCustomer(!!profile.stripe_customer_id)

      // For collaborators, show the master's plan instead of their own
      if (profile.role === 'collaborator') {
        const { data: collab } = await supabase
          .from('collaborators')
          .select('master_user_id')
          .eq('collaborator_user_id', user.id)
          .eq('status', 'active')
          .single()
        if (collab?.master_user_id) {
          const { data: masterProfile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, stripe_customer_id')
            .eq('id', collab.master_user_id)
            .single()
          if (masterProfile) {
            setTier(masterProfile.subscription_tier || 'gratis')
            setHasStripeCustomer(!!masterProfile.stripe_customer_id)
          }
        }
      } else {
        setTier(profile.subscription_tier || 'gratis')
      }

      // Parse collaborators from JSONB array (email only)
      const emails = profile.collaborator_emails || []
      const collabList = emails.map((email: string) => ({ email }))
      setCollaborators(collabList)

      // Check unified Google (Calendar + Drive) status
      const googleStatus = await fetch('/api/google/status')
      const googleData = await googleStatus.json()
      setGoogleConnected(googleData.connected || false)
      setScopeValid(googleData.scope_valid || false)

      // Check Tribunal Electrónico status
      setTribunalStatusLoading(true)
      const tribunalStatusRes = await fetch('/api/tribunal/credentials/status')
      if (tribunalStatusRes.ok) {
        const tribunalData = await tribunalStatusRes.json()
        setTribunalStatus({
          hasCredentials: tribunalData.hasCredentials || false,
          lastSyncAt: tribunalData.lastSyncAt || null
        })
      }
      setTribunalStatusLoading(false)
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
          timezone: timezone,
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

  const openCredentialsDialog = (updateMode: boolean) => {
    setIsUpdateMode(updateMode)
    setShowCredentialsDialog(true)
    // Reset form
    setTribunalEmail('')
    setTribunalPassword('')
    setTribunalKeyFile(null)
    setTribunalCerFile(null)
    setTribunalValidationProgress('')
    setError(null)
  }

  const handleSaveTribunalCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setTribunalSaving(true)
    setError(null)
    setTribunalValidationProgress('Procesando archivos...')

    let progressInterval: NodeJS.Timeout | null = null

    try {
      // Validate inputs
      if (!tribunalEmail || !tribunalPassword || !tribunalKeyFile || !tribunalCerFile) {
        throw new Error('Todos los campos son requeridos')
      }

      // Convert files to base64
      const keyFileBase64 = await fileToBase64(tribunalKeyFile)
      const cerFileBase64 = await fileToBase64(tribunalCerFile)

      // Call API route which handles validation AND baseline creation
      setTribunalValidationProgress('Validando credenciales con Tribunal Electrónico...')

      // Simulate progress updates for better UX (actual validation happens on server)
      const progressMessages = [
        'Validando credenciales con Tribunal Electrónico...',
        'Conectando al portal del Tribunal...',
        'Verificando acceso...',
        'Escaneando documentos existentes...',
        'Creando baseline de documentos históricos...',
        'Guardando credenciales de forma segura...'
      ]

      let progressIndex = 0
      progressInterval = setInterval(() => {
        progressIndex++
        if (progressIndex < progressMessages.length) {
          setTribunalValidationProgress(progressMessages[progressIndex])
        }
      }, 8000) // Update every 8 seconds

      const saveResponse = await fetch('/api/tribunal/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tribunalEmail,
          password: tribunalPassword,
          keyFileBase64: keyFileBase64.split(',')[1], // Remove data:* prefix
          cerFileBase64: cerFileBase64.split(',')[1],
          keyFileName: tribunalKeyFile.name,
          cerFileName: tribunalCerFile.name,
          skipValidation: false // Let API validate and create baseline
        })
      })

      if (progressInterval) clearInterval(progressInterval)

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        throw new Error(errorData.error || 'Error al guardar credenciales')
      }

      setTribunalValidationProgress('✓ Credenciales guardadas exitosamente')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setShowCredentialsDialog(false)
      }, 2000)

      await loadProfile() // Refresh status

      // Reset form
      setTribunalEmail('')
      setTribunalPassword('')
      setTribunalKeyFile(null)
      setTribunalCerFile(null)
      setTribunalValidationProgress('')
    } catch (err) {
      console.error('Error saving tribunal credentials:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar credenciales')
      setTribunalValidationProgress('')
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      setTribunalSaving(false)
    }
  }

  const handleDeleteTribunalCredentials = async () => {
    setTribunalDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/tribunal/credentials', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar credenciales')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      setShowDeleteDialog(false)
      await loadProfile() // Refresh status
    } catch (err) {
      console.error('Error deleting tribunal credentials:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar credenciales')
    } finally {
      setTribunalDeleting(false)
    }
  }

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Block collaborators from accessing settings
  if (isCollaborator) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container max-w-2xl mx-auto py-8 px-4">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
              <CardDescription>
                Como colaborador, no tienes permiso para acceder a la configuración de la cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Solo el propietario de la cuenta puede modificar la configuración, gestionar suscripciones
                y administrar colaboradores.
              </p>
              <Button asChild variant="outline">
                <a href="/dashboard">Volver al Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
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

            {/* Timezone Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-base">
                  Zona Horaria
                </Label>
                <p className="text-sm text-muted-foreground">
                  Selecciona tu zona horaria para agendar reuniones correctamente
                </p>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Tijuana">🇲🇽 Baja California (Tijuana)</SelectItem>
                    <SelectItem value="America/Mexico_City">🇲🇽 México Central (CDMX)</SelectItem>
                    <SelectItem value="America/Cancun">🇲🇽 Quintana Roo (Cancún)</SelectItem>
                    <SelectItem value="America/Hermosillo">🇲🇽 Sonora (Hermosillo)</SelectItem>
                    <SelectItem value="America/Chihuahua">🇲🇽 Chihuahua</SelectItem>
                    <SelectItem value="America/Mazatlan">🇲🇽 Sinaloa/Nayarit (Mazatlán)</SelectItem>
                    <SelectItem value="America/Monterrey">🇲🇽 Nuevo León (Monterrey)</SelectItem>
                    <SelectItem value="America/Los_Angeles">🇺🇸 Pacific (Los Angeles)</SelectItem>
                    <SelectItem value="America/Phoenix">🇺🇸 Arizona (Phoenix)</SelectItem>
                    <SelectItem value="America/Denver">🇺🇸 Mountain (Denver)</SelectItem>
                    <SelectItem value="America/Chicago">🇺🇸 Central (Chicago)</SelectItem>
                    <SelectItem value="America/New_York">🇺🇸 Eastern (New York)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esta zona horaria se usará para interpretar las fechas y horas de tus reuniones
                </p>
              </div>
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

      {/* Tribunal Electrónico Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tribunal Electrónico</CardTitle>
          <CardDescription>
            Descarga automática de documentos del Tribunal Electrónico PJBC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cuando está habilitado, el sistema descargará automáticamente documentos
              del Tribunal Electrónico para todos los expedientes que estás monitoreando.
              Los documentos aparecerán en la pestaña "Archivos" de cada expediente con un badge de Tribunal Electrónico.
            </p>

            {tribunalStatusLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tribunalStatus.hasCredentials ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">✓ Configurado</Badge>
                  {tribunalStatus.lastSyncAt && (
                    <span className="text-sm text-muted-foreground">
                      Última sincronización: {new Date(tribunalStatus.lastSyncAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Nota:</strong> Las credenciales del Tribunal Electrónico están configuradas y activas.
                    Los documentos se sincronizan automáticamente cada 24 horas y aparecen en la pestaña "Archivos" de tus expedientes monitoreados.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openCredentialsDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar Credenciales
                  </Button>

                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={tribunalDeleting}
                  >
                    {tribunalDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Credenciales
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription className="text-sm">
                    No has configurado tus credenciales del Tribunal Electrónico.
                    Configura tus credenciales para habilitar la descarga automática de documentos.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full"
                  onClick={() => openCredentialsDialog(false)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Configurar Credenciales
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Update Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode ? 'Actualizar' : 'Configurar'} Credenciales del Tribunal Electrónico
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                {isUpdateMode
                  ? 'Ingresa tus nuevas credenciales y certificados. Se validarán antes de guardar.'
                  : 'Ingresa tus credenciales del Tribunal Electrónico PJBC para habilitar la sincronización automática de documentos.'}
              </p>
              <p className="text-xs text-muted-foreground">
                Nota: Se validarán tus credenciales conectándose al Tribunal Electrónico. Este proceso puede tomar 30-60 segundos.
              </p>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTribunalCredentials} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="tribunal-email">Email</Label>
              <Input
                id="tribunal-email"
                type="email"
                placeholder="tu@email.com"
                value={tribunalEmail}
                onChange={(e) => setTribunalEmail(e.target.value)}
                disabled={tribunalSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tu correo electrónico del Tribunal Electrónico PJBC
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribunal-password">Contraseña</Label>
              <Input
                id="tribunal-password"
                type="password"
                placeholder="••••••••"
                value={tribunalPassword}
                onChange={(e) => setTribunalPassword(e.target.value)}
                disabled={tribunalSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tu contraseña del Tribunal Electrónico
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribunal-key">Archivo .key (Llave Privada)</Label>
              <div className="relative">
                <input
                  id="tribunal-key"
                  type="file"
                  accept=".key"
                  onChange={(e) => setTribunalKeyFile(e.target.files?.[0] || null)}
                  disabled={tribunalSaving}
                  required
                  className="hidden"
                />
                {!tribunalKeyFile ? (
                  <label
                    htmlFor="tribunal-key"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Seleccionar archivo .key
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center gap-2 w-full px-4 py-3 border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <File className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300 flex-1 truncate">
                      {tribunalKeyFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTribunalKeyFile(null)}
                      disabled={tribunalSaving}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tu archivo de llave privada (.key)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribunal-cer">Archivo .cer (Certificado)</Label>
              <div className="relative">
                <input
                  id="tribunal-cer"
                  type="file"
                  accept=".cer"
                  onChange={(e) => setTribunalCerFile(e.target.files?.[0] || null)}
                  disabled={tribunalSaving}
                  required
                  className="hidden"
                />
                {!tribunalCerFile ? (
                  <label
                    htmlFor="tribunal-cer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Seleccionar archivo .cer
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center gap-2 w-full px-4 py-3 border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <File className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300 flex-1 truncate">
                      {tribunalCerFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTribunalCerFile(null)}
                      disabled={tribunalSaving}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tu archivo de certificado (.cer)
              </p>
            </div>

            {tribunalValidationProgress && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  {tribunalValidationProgress}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCredentialsDialog(false)
                  setTribunalValidationProgress('')
                  setError(null)
                }}
                disabled={tribunalSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={tribunalSaving}>
                {tribunalSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>{isUpdateMode ? 'Actualizar' : 'Guardar'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar credenciales del Tribunal Electrónico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará tus credenciales guardadas y deshabilitará la sincronización automática
              de documentos. Podrás volver a configurarlas en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={tribunalDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTribunalCredentials}
              disabled={tribunalDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tribunalDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
