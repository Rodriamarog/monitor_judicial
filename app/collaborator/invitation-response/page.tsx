'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Clock, AlertTriangle, LogIn, Mail } from 'lucide-react'

function InvitationResponseContent() {
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')
  const newAccount = searchParams?.get('new') === 'true' // Check if new account was created
  const email = searchParams?.get('email') // Get collaborator email

  const getStatusContent = () => {
    switch (status) {
      case 'password-set':
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-primary" />,
          title: '¡Cuenta Creada Exitosamente!',
          description: 'Tu cuenta de colaborador ha sido configurada.',
          message: (
            <div className="space-y-4">
              <Alert className="border-primary/20 bg-primary/5">
                <LogIn className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong className="text-foreground">Ya puedes iniciar sesión</strong>
                  <p className="mt-1 text-sm">
                    Usa tu correo electrónico <strong>{email}</strong> y la contraseña que acabas de
                    crear para acceder a Monitor Judicial.
                  </p>
                </AlertDescription>
              </Alert>

              <p className="text-sm text-muted-foreground">
                Como colaborador, podrás ver los casos que te sean asignados y recibirás
                notificaciones por email cuando se detecten actualizaciones.
              </p>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Nota importante:</strong> Como colaborador, solo recibirás alertas de los casos
                  específicos que te asigne el propietario de la cuenta. Tendrás acceso de solo lectura
                  a esos casos.
                </AlertDescription>
              </Alert>
            </div>
          ),
          actions: (
            <>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Link>
              </Button>
            </>
          ),
        }

      case 'accepted':
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-primary" />,
          title: '¡Invitación Aceptada!',
          description: 'Has aceptado la invitación para colaborar en Monitor Judicial.',
          message: (
            <div className="space-y-4">
              {newAccount ? (
                <>
                  <Alert className="border-primary/20 bg-primary/5">
                    <Mail className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong className="text-foreground">Revisa tu correo electrónico</strong>
                      <p className="mt-1 text-sm">
                        Te hemos enviado un correo a <strong>{email}</strong> con tus credenciales de acceso.
                        Usa esa información para iniciar sesión en Monitor Judicial.
                      </p>
                    </AlertDescription>
                  </Alert>
                  <p className="text-sm text-muted-foreground">
                    Una vez que inicies sesión, podrás ver los casos que te sean asignados y recibirás
                    notificaciones por email cuando se detecten actualizaciones.
                  </p>
                </>
              ) : (
                <>
                  <Alert className="border-primary/20 bg-primary/5">
                    <LogIn className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong className="text-foreground">Ya tienes una cuenta</strong>
                      <p className="mt-1 text-sm">
                        Puedes iniciar sesión con tus credenciales existentes de Monitor Judicial.
                        Si olvidaste tu contraseña, usa la opción "¿Olvidaste tu contraseña?" en la
                        página de inicio de sesión.
                      </p>
                    </AlertDescription>
                  </Alert>
                  <p className="text-sm text-muted-foreground">
                    Ahora recibirás notificaciones por email cuando se detecten actualizaciones en los casos
                    judiciales que te asignen.
                  </p>
                </>
              )}

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Nota importante:</strong> Como colaborador, solo recibirás alertas de los casos
                  específicos que te asigne el propietario de la cuenta. Tendrás acceso de solo lectura
                  a esos casos.
                </AlertDescription>
              </Alert>
            </div>
          ),
          actions: (
            <>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Link>
              </Button>
            </>
          ),
        }

      case 'rejected':
        return {
          icon: <XCircle className="h-16 w-16 text-muted-foreground" />,
          title: 'Invitación Rechazada',
          description: 'Has rechazado la invitación para colaborar.',
          message: (
            <p className="text-muted-foreground">
              No recibirás ninguna notificación de esta cuenta. Si cambiaste de opinión, contacta al
              propietario de la cuenta para que te envíe una nueva invitación.
            </p>
          ),
          actions: null,
        }

      case 'expired':
        return {
          icon: <Clock className="h-16 w-16 text-amber-600 dark:text-amber-500" />,
          title: 'Invitación Expirada',
          description: 'Esta invitación ha expirado.',
          message: (
            <p className="text-muted-foreground">
              Las invitaciones son válidas por 7 días. Si aún deseas colaborar, contacta al propietario
              de la cuenta para que te envíe una nueva invitación.
            </p>
          ),
          actions: null,
        }

      case 'error':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-destructive" />,
          title: 'Error al Procesar Invitación',
          description: 'Ocurrió un error al procesar tu respuesta.',
          message: (
            <p className="text-muted-foreground">
              Por favor intenta nuevamente más tarde. Si el problema persiste, contacta al propietario
              de la cuenta.
            </p>
          ),
          actions: null,
        }

      case 'invalid':
      default:
        return {
          icon: <AlertTriangle className="h-16 w-16 text-destructive" />,
          title: 'Invitación Inválida',
          description: 'El enlace de invitación no es válido.',
          message: (
            <p className="text-muted-foreground">
              Este enlace puede haber sido cancelado, ya utilizado, o no es válido. Si crees que esto
              es un error, contacta al propietario de la cuenta.
            </p>
          ),
          actions: null,
        }
    }
  }

  const content = getStatusContent()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">{content.icon}</div>
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">{content.title}</CardTitle>
            <CardDescription className="text-base mt-2">{content.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>{content.message}</div>

          {status === 'accepted' && (
            <div className="space-y-3 border-t pt-6">
              <h3 className="font-semibold text-sm text-foreground">¿Qué es Monitor Judicial?</h3>
              <p className="text-sm text-muted-foreground">
                Monitor Judicial es un sistema automatizado que rastrea boletines judiciales del Poder
                Judicial de Baja California y notifica cuando aparecen casos específicos. Como colaborador,
                recibirás alertas de los casos que te asignen.
              </p>
            </div>
          )}

          {content.actions && <div className="flex flex-col sm:flex-row gap-3 pt-4">{content.actions}</div>}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitationResponsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">Cargando...</div>
        </div>
      }
    >
      <InvitationResponseContent />
    </Suspense>
  )
}
