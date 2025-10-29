'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('phone, whatsapp_enabled, email_notifications_enabled')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setPhone(profile.phone || '')
      setWhatsappEnabled(profile.whatsapp_enabled || false)
      setEmailEnabled(profile.email_notifications_enabled !== false)
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
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Configuración guardada exitosamente
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
