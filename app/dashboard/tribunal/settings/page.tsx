'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertTriangle, Upload, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TribunalSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [cerFile, setCerFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/tribunal/credentials/status')
      const data = await response.json()

      if (data.hasCredentials) {
        setHasCredentials(true)
        setStatus(data)
        setEmail(data.email || '')
      }
    } catch (err) {
      console.error('Error loading status:', err)
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
      if (!email || !password || !keyFile || !cerFile) {
        setError('Todos los campos son requeridos')
        setSaving(false)
        return
      }

      // Convert files to base64
      const keyFileBase64 = await fileToBase64(keyFile)
      const cerFileBase64 = await fileToBase64(cerFile)

      const response = await fetch('/api/tribunal/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          keyFileBase64,
          cerFileBase64,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar credenciales')
      }

      setSuccess(true)
      setHasCredentials(true)
      await loadStatus()
      setTimeout(() => {
        router.push('/dashboard/tribunal')
      }, 2000)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar tus credenciales?')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/tribunal/credentials', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar credenciales')
      }

      setHasCredentials(false)
      setStatus(null)
      setEmail('')
      setPassword('')
      setKeyFile(null)
      setCerFile(null)
      setSuccess(true)
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/tribunal">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Documentos
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración Tribunal Electrónico</CardTitle>
          <CardDescription>
            Configura tus credenciales para acceder al Tribunal Electrónico PJBC
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Credenciales guardadas exitosamente
              </AlertDescription>
            </Alert>
          )}

          {hasCredentials && status && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Credenciales actuales
              </p>
              <p className="text-sm text-blue-700">Email: {status.email}</p>
              <p className="text-sm text-blue-700">
                Estado: {status.status === 'active' ? '✓ Activo' : '✗ Inactivo'}
              </p>
              {status.lastSyncAt && (
                <p className="text-sm text-blue-700">
                  Última sincronización:{' '}
                  {new Date(status.lastSyncAt).toLocaleString('es-MX')}
                </p>
              )}
            </div>
          )}

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              ℹ️ Las credenciales se verificarán automáticamente durante la primera sincronización.
              No es necesario probar la conexión antes de guardar.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="keyFile">Archivo .key (Llave Privada)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="keyFile"
                  type="file"
                  accept=".key"
                  onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                  disabled={saving}
                />
                {keyFile && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              </div>
            </div>

            <div>
              <Label htmlFor="cerFile">Archivo .cer (Certificado)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cerFile"
                  type="file"
                  accept=".cer"
                  onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                  disabled={saving}
                />
                {cerFile && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasCredentials ? 'Actualizar' : 'Guardar'} Credenciales
              </Button>

              {hasCredentials && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Eliminar Credenciales
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
