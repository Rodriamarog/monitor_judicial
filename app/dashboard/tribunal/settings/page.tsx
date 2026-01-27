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
  const [successMessage, setSuccessMessage] = useState('Credenciales guardadas exitosamente')
  const [hasCredentials, setHasCredentials] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  const [currentProgress, setCurrentProgress] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)

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
    setValidating(true)
    setCurrentProgress('Iniciando...')
    setProgressPercent(0)

    try {
      // All fields are required for both creating and updating
      if (!email || !password || !keyFile || !cerFile) {
        setError('Todos los campos son requeridos')
        setSaving(false)
        setValidating(false)
        setCurrentProgress('')
        setProgressPercent(0)
        return
      }

      // Convert files to base64
      const keyFileBase64 = await fileToBase64(keyFile)
      const cerFileBase64 = await fileToBase64(cerFile)

      // Step 1: Validate credentials with Hetzner SSE endpoint
      const hetznerUrl = process.env.NEXT_PUBLIC_HETZNER_VALIDATION_URL || 'http://localhost:3001/validate-credentials'

      const validationResponse = await fetch(hetznerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          keyFileBase64,
          cerFileBase64
        })
      })

      if (!validationResponse.ok) {
        throw new Error('Error al comunicarse con el servidor de validación')
      }

      // Progress step mapping
      const progressSteps: Record<string, number> = {
        'Iniciando navegador...': 10,
        'Validando credenciales...': 20,
        'Ingresando a la cuenta...': 35,
        'Navegando a Tribunal Electrónico...': 50,
        'Verificando conexión...': 65,
        'Cargando información...': 70,
        'Procesando datos...': 75,
        'Verificando acceso...': 90,
        '✓ Validación exitosa': 100
      }

      // Read SSE stream and update progress
      const reader = validationResponse.body?.getReader()
      const decoder = new TextDecoder()
      let finalResult: any = null

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.message) {
                  // Update current message (not stacking)
                  setCurrentProgress(data.message)

                  // Update progress bar based on message
                  for (const [key, percent] of Object.entries(progressSteps)) {
                    if (data.message.includes(key)) {
                      setProgressPercent(percent)
                      break
                    }
                  }
                }

                if (data.done) {
                  finalResult = data
                  break
                }
              } catch (e) {
                console.error('Error parsing SSE:', e)
              }
            }
          }

          if (finalResult) break
        }
      }

      if (!finalResult || !finalResult.success) {
        throw new Error(finalResult?.error || 'Credenciales inválidas')
      }

      // Step 2: Save credentials to Vercel API (without re-validation)
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
          keyFileName: keyFile.name,
          cerFileName: cerFile.name,
          skipValidation: true // Flag to skip re-validation
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar credenciales')
      }

      setSuccessMessage('Credenciales guardadas exitosamente')
      setSuccess(true)
      setHasCredentials(true)
      await loadStatus()
      // Clear form fields after successful save
      setPassword('')
      setKeyFile(null)
      setCerFile(null)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
      setValidating(false)
      setCurrentProgress('')
      setProgressPercent(0)
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
      setSuccessMessage('Credenciales eliminadas exitosamente')
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
    <div className="h-screen overflow-y-auto">
      <div className="container mx-auto p-6 max-w-3xl pb-24">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Link href="/dashboard/tribunal">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <CardTitle>Configuración Tribunal Electrónico</CardTitle>
              <CardDescription>
                Configura tus credenciales para acceder al Tribunal Electrónico PJBC
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {validating && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold">Validando credenciales</span>
                    <p className="text-xs mt-1 text-blue-700 dark:text-blue-200">
                      {currentProgress || 'Iniciando validación...'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>

                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    {progressPercent}% completado
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && !validating && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Seguridad de tus credenciales
            </p>
            <div className="text-sm text-green-800 dark:text-green-200 space-y-1.5">
              <p>
                • <strong>Encriptacion con AES-256:</strong> Tus credenciales se almacenan de manera encriptada
              </p>
              <p>
                • <strong>Protección de datos:</strong> Las contraseñas y certificados nunca se exponen públicamente
              </p>
              <p>
                • <strong>Acceso restringido:</strong> Solo el sistema automatizado puede acceder a tus credenciales
              </p>
              <p className="text-xs pt-1 text-green-700 dark:text-green-300">
                Tus datos están protegidos con los mismos estándares que usan instituciones financieras
              </p>
            </div>
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
              <div className="flex items-center gap-3">
                <input
                  id="keyFile"
                  type="file"
                  accept=".key"
                  onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                  disabled={saving}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('keyFile')?.click()}
                  disabled={saving}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar Archivo
                </Button>
                {keyFile ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground truncate max-w-xs">
                      {keyFile.name}
                    </span>
                  </div>
                ) : hasCredentials && status?.keyFileName ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground truncate max-w-xs">
                      {status.keyFileName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Ningún archivo seleccionado
                  </span>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="cerFile">Archivo .cer (Certificado)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="cerFile"
                  type="file"
                  accept=".cer"
                  onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                  disabled={saving}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('cerFile')?.click()}
                  disabled={saving}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar Archivo
                </Button>
                {cerFile ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground truncate max-w-xs">
                      {cerFile.name}
                    </span>
                  </div>
                ) : hasCredentials && status?.cerFileName ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground truncate max-w-xs">
                      {status.cerFileName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Ningún archivo seleccionado
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
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
    </div>
  )
}
