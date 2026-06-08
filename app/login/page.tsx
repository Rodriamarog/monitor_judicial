'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Scale } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      if (loginError.message.includes('Email not confirmed')) {
        setError('Por favor confirme su correo electrónico antes de iniciar sesión. Revise su bandeja de entrada.')
      } else {
        setError(loginError.message)
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 p-12 relative overflow-hidden"
        style={{ background: 'oklch(0.13 0.01 264)' }}
      >
        {/* Amber glow accent at bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 110%, oklch(0.769 0.188 70.08 / 0.22) 0%, transparent 70%)' }}
        />

        {/* App name */}
        <div className="text-center">
          <p className="text-2xl font-bold text-white">Monitor Judicial</p>
          <p className="text-sm text-white/70 mt-1">Poder Judicial de Baja California</p>
        </div>

        {/* Logo card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <Scale className="h-16 w-16 text-primary" />
        </div>

        {/* Headline + description */}
        <div className="text-center max-w-sm">
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Bienvenido a Monitor Judicial PJBC
          </h2>
          <p className="text-white/75 leading-relaxed">
            Accede a tu panel y recibe alertas automáticas cuando haya actualizaciones en tus expedientes judiciales.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 bg-background">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-3 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Monitor Judicial PJBC</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Iniciar sesión</h1>
            <p className="text-muted-foreground">Ingrese sus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/reset-password" className="text-xs text-primary hover:underline">
                  ¿Olvidó su contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ¿No tiene cuenta?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Regístrese aquí
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
