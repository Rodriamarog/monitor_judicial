'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Calendar, RefreshCw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false)
  const [googleCalendarId, setGoogleCalendarId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [calendarSuccess, setCalendarSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()

    // Check for OAuth callback success/error
    const calendarSuccess = searchParams.get('calendar_success')
    const calendarError = searchParams.get('calendar_error')

    if (calendarSuccess === 'connected') {
      setCalendarSuccess(true)
      setTimeout(() => setCalendarSuccess(false), 5000)
      // Clean up URL
      router.replace('/dashboard/settings')
    }

    if (calendarError) {
      setError(`Error de Google Calendar: ${calendarError}`)
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
        .select('phone, whatsapp_enabled, email_notifications_enabled, google_calendar_enabled, google_calendar_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setPhone(profile.phone || '')
      setWhatsappEnabled(profile.whatsapp_enabled || false)
      setEmailEnabled(profile.email_notifications_enabled !== false)
      setGoogleCalendarEnabled(profile.google_calendar_enabled || false)
      setGoogleCalendarId(profile.google_calendar_id || null)
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

  const handleConnectGoogleCalendar = async () => {
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/google-calendar/connect')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate OAuth')
      }

      // Redirect to Google OAuth
      window.location.href = data.url
    } catch (err) {
      console.error('Error connecting Google Calendar:', err)
      setError(err instanceof Error ? err.message : 'Error al conectar calendario')
      setConnecting(false)
    }
  }

  const handleDisconnectGoogleCalendar = async () => {
    if (!confirm('¿Estás seguro de que quieres desconectar Google Calendar?')) {
      return
    }

    setDisconnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      setGoogleCalendarEnabled(false)
      setGoogleCalendarId(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      setError(err instanceof Error ? err.message : 'Error al desconectar calendario')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSyncCalendar = async () => {
    setSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error syncing calendar:', err)
      setError(err instanceof Error ? err.message : 'Error al sincronizar calendario')
    } finally {
      setSyncing(false)
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
    <div className="container max-w-2xl mx-auto py-8 px-4">
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
                  ✓ Google Calendar conectado exitosamente
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

                  <Alert>
                    <AlertDescription className="text-sm space-y-2">
                      <p className="font-semibold">⚠️ Importante - Unirse al Sandbox de Twilio:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Envía un mensaje de WhatsApp al número: <strong>+1 415 523 8886</strong></li>
                        <li>El mensaje debe decir: <strong>join &lt;código&gt;</strong></li>
                        <li>El código te lo proporciona el administrador</li>
                        <li>Recibirás una confirmación cuando estés unido</li>
                      </ol>
                      <p className="text-xs text-muted-foreground mt-2">
                        Esto solo es necesario una vez. Sin este paso, no podrás recibir mensajes.
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            {/* Google Calendar Integration */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Integración con Google Calendar
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sincroniza tus eventos con Google Calendar automáticamente
                  </p>
                </div>
              </div>

              {!googleCalendarEnabled ? (
                <div className="pl-4 border-l-2 border-muted space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Conecta tu cuenta de Google para ver y gestionar tus eventos de calendario directamente en Monitor Judicial.
                  </p>
                  <Button
                    type="button"
                    onClick={handleConnectGoogleCalendar}
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
                        <Calendar className="h-4 w-4" />
                        <span>Conectar Google Calendar</span>
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="pl-4 border-l-2 border-primary space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm">
                      <p className="font-semibold">✓ Conectado a Google Calendar</p>
                      {googleCalendarId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Calendar ID: {googleCalendarId}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleSyncCalendar}
                      disabled={syncing}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      {syncing ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sincronizando...</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          <span>Sincronizar Ahora</span>
                        </span>
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleDisconnectGoogleCalendar}
                      disabled={disconnecting}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      {disconnecting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Desconectando...</span>
                        </span>
                      ) : (
                        'Desconectar'
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Los eventos que crees en Monitor Judicial se sincronizarán automáticamente con Google Calendar.
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
    </div>
  )
}
