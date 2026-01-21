'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Home, LogIn } from 'lucide-react'

function InvitationResponseContent() {
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')

  const getStatusContent = () => {
    switch (status) {
      case 'accepted':
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: '¡Invitación Aceptada!',
          description: 'Has aceptado la invitación para colaborar en Monitor Judicial.',
          message: (
            <div className="space-y-4">
              <p>
                Ahora recibirás notificaciones por email cuando se detecten actualizaciones en los casos
                judiciales que te asignen.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Nota:</strong> Solo recibirás alertas de los casos específicos que el propietario
                  de la cuenta te asigne. No recibirás todas sus alertas.
                </p>
              </div>
            </div>
          ),
          actions: (
            <>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/signup">
                  <LogIn className="h-4 w-4 mr-2" />
                  Crear Mi Propia Cuenta
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Ir al Inicio
                </Link>
              </Button>
            </>
          ),
        }

      case 'rejected':
        return {
          icon: <XCircle className="h-16 w-16 text-gray-500" />,
          title: 'Invitación Rechazada',
          description: 'Has rechazado la invitación para colaborar.',
          message: (
            <p>
              No recibirás ninguna notificación de esta cuenta. Si cambiaste de opinión, contacta al
              propietario de la cuenta para que te envíe una nueva invitación.
            </p>
          ),
          actions: (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al Inicio
              </Link>
            </Button>
          ),
        }

      case 'expired':
        return {
          icon: <Clock className="h-16 w-16 text-orange-500" />,
          title: 'Invitación Expirada',
          description: 'Esta invitación ha expirado.',
          message: (
            <p>
              Las invitaciones son válidas por 7 días. Si aún deseas colaborar, contacta al propietario
              de la cuenta para que te envíe una nueva invitación.
            </p>
          ),
          actions: (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al Inicio
              </Link>
            </Button>
          ),
        }

      case 'error':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-red-500" />,
          title: 'Error al Procesar Invitación',
          description: 'Ocurrió un error al procesar tu respuesta.',
          message: (
            <p>
              Por favor intenta nuevamente más tarde. Si el problema persiste, contacta al propietario
              de la cuenta.
            </p>
          ),
          actions: (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al Inicio
              </Link>
            </Button>
          ),
        }

      case 'invalid':
      default:
        return {
          icon: <AlertTriangle className="h-16 w-16 text-red-500" />,
          title: 'Invitación Inválida',
          description: 'El enlace de invitación no es válido.',
          message: (
            <p>
              Este enlace puede haber sido cancelado, ya utilizado, o no es válido. Si crees que esto
              es un error, contacta al propietario de la cuenta.
            </p>
          ),
          actions: (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al Inicio
              </Link>
            </Button>
          ),
        }
    }
  }

  const content = getStatusContent()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">{content.icon}</div>
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">{content.title}</CardTitle>
            <CardDescription className="text-base mt-2">{content.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-muted-foreground">{content.message}</div>

          {status === 'accepted' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">¿Qué es Monitor Judicial?</h3>
              <p className="text-sm text-muted-foreground">
                Monitor Judicial es un sistema automatizado que rastrea boletines judiciales del Poder
                Judicial de Baja California y notifica cuando aparecen casos específicos. Como colaborador,
                recibirás alertas de los casos que te asignen.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">{content.actions}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitationResponsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">Cargando...</div>
        </div>
      }
    >
      <InvitationResponseContent />
    </Suspense>
  )
}
