import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Search, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          {/* 404 Icon */}
          <div className="flex justify-center">
            <FileQuestion className="h-24 w-24 text-amber-500" />
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-foreground">404</h1>
            <h2 className="text-2xl font-semibold text-foreground">
              Página No Encontrada
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Lo sentimos, la página que estás buscando no existe o ha sido movida.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/">
              <Button className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" />
                Ir al Inicio
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Search className="h-4 w-4" />
                Mis Casos
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                Ver Planes
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              ¿Necesitas ayuda?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Inicia sesión
              </Link>{' '}
              o{' '}
              <Link
                href="/signup"
                className="text-primary hover:underline font-medium"
              >
                crea una cuenta
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
