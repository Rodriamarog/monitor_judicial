'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, AlertTriangle } from 'lucide-react'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invitación inválida</CardTitle>
            <CardDescription>El enlace de invitación no es válido o ha expirado.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const acceptUrl = `/api/collaborators/accept?token=${token}&action=accept`

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <UserPlus className="h-12 w-12 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Invitación para colaborar</CardTitle>
            <CardDescription className="text-base mt-2">
              Has sido invitado a colaborar en Monitor Judicial
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            Como colaborador, tendrás acceso de lectura a los expedientes que te sean asignados
            y recibirás alertas cuando haya actualizaciones en ellos.
          </p>
          <Button asChild className="w-full">
            <Link href={acceptUrl}>
              <UserPlus className="h-4 w-4 mr-2" />
              Aceptar invitación
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Si no esperabas esta invitación, puedes ignorar este mensaje.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">Cargando...</div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}
