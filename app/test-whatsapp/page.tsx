'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function TestWhatsAppPage() {
  const [phone, setPhone] = useState('+52664')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string; messageId?: string } | null>(null)

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // Format phone number to WhatsApp format
      let formattedPhone = phone.trim()
      if (!formattedPhone.startsWith('whatsapp:')) {
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+52' + formattedPhone
        }
        formattedPhone = 'whatsapp:' + formattedPhone
      }

      const response = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: formattedPhone }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Probar WhatsApp</CardTitle>
          <CardDescription>
            Envía un mensaje de prueba a tu WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+52 664 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Debe ser el mismo número que usaste para unirte al sandbox de Twilio
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enviando...</span>
                </span>
              ) : (
                'Enviar Mensaje de Prueba'
              )}
            </Button>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  {result.success ? (
                    <>
                      ✅ Mensaje enviado exitosamente!
                      <br />
                      <span className="text-xs">Message SID: {result.messageId}</span>
                    </>
                  ) : (
                    <>
                      ❌ Error: {result.error}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg text-sm space-y-2">
              <p className="font-semibold">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Ve a tu Twilio Console → Messaging → Try WhatsApp</li>
                <li>Copia el código de unión (ej: "join abc-def")</li>
                <li>Envía ese código al número del sandbox desde tu WhatsApp</li>
                <li>Ingresa tu número aquí y presiona "Enviar"</li>
              </ol>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
