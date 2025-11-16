import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Monitor Judicial PJBC',
  description: 'Política de privacidad de Monitor Judicial - Cómo protegemos y utilizamos tu información',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Política de Privacidad
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Información que Recopilamos</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Monitor Judicial recopila la siguiente información:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li><strong>Información de cuenta:</strong> Correo electrónico, nombre, número de teléfono (opcional)</li>
              <li><strong>Información de casos:</strong> Números de expediente y juzgados que deseas monitorear</li>
              <li><strong>Información de pago:</strong> Procesada de forma segura por Stripe (no almacenamos datos de tarjetas)</li>
              <li><strong>Datos de Google Calendar:</strong> Si conectas tu calendario, accedemos a eventos para sincronización (ver sección 5)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Cómo Usamos tu Información</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Utilizamos tu información para:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Monitorear boletines judiciales y enviarte alertas de tus casos</li>
              <li>Enviar notificaciones por correo electrónico y WhatsApp (si están habilitadas)</li>
              <li>Sincronizar audiencias con tu Google Calendar (si está conectado)</li>
              <li>Procesar pagos de suscripción</li>
              <li>Mejorar nuestros servicios</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. Compartir Información</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No vendemos ni compartimos tu información personal con terceros, excepto:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li><strong>Stripe:</strong> Para procesar pagos de forma segura</li>
              <li><strong>Twilio:</strong> Para enviar notificaciones por WhatsApp (si están habilitadas)</li>
              <li><strong>Resend:</strong> Para enviar notificaciones por correo electrónico</li>
              <li><strong>Google:</strong> Para sincronización de calendario (si está conectado)</li>
              <li><strong>Supabase:</strong> Para almacenar datos de forma segura</li>
              <li><strong>Autoridades:</strong> Si la ley lo requiere</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Almacenamiento de Datos</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Tus datos se almacenan en servidores seguros de Supabase (Amazon Web Services) ubicados en Estados Unidos.
              Mantenemos:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Datos de cuenta mientras tu suscripción esté activa</li>
              <li>Boletines judiciales por 90 días</li>
              <li>Alertas históricas mientras tu cuenta esté activa</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Uso de Google Calendar API</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Si decides conectar tu Google Calendar:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li><strong>Permisos:</strong> Solicitamos acceso para crear y modificar eventos en tu calendario</li>
              <li><strong>Uso:</strong> Creamos eventos automáticamente cuando hay audiencias en tus casos monitoreados</li>
              <li><strong>Sincronización:</strong> Los cambios en tu calendario se sincronizan bidireccionalmente</li>
              <li><strong>Desconexión:</strong> Puedes desconectar Google Calendar en cualquier momento desde tu configuración</li>
              <li><strong>Límite de uso:</strong> El uso de información recibida de las APIs de Google cumple con la{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Política de Datos de Usuario de Servicios API de Google
                </a>, incluyendo los requisitos de Uso Limitado
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mt-4">
              <strong>Monitor Judicial no utiliza ni transfiere información de Google Calendar para ningún propósito
              no relacionado con la funcionalidad de sincronización de audiencias.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Seguridad</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Implementamos medidas de seguridad para proteger tu información:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Cifrado en tránsito (HTTPS/TLS)</li>
              <li>Autenticación segura con Supabase</li>
              <li>Tokens de acceso cifrados para Google Calendar</li>
              <li>No almacenamos datos de tarjetas de crédito</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Tus Derechos</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Tienes derecho a:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Acceder a tus datos personales</li>
              <li>Corregir datos incorrectos</li>
              <li>Eliminar tu cuenta y datos</li>
              <li>Exportar tus datos</li>
              <li>Desconectar servicios de terceros (Google Calendar, WhatsApp)</li>
              <li>Cancelar tu suscripción en cualquier momento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Cookies</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Utilizamos cookies esenciales para:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Mantener tu sesión activa</li>
              <li>Recordar tus preferencias</li>
              <li>Mejorar la seguridad</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. Cambios a esta Política</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Podemos actualizar esta política. Te notificaremos de cambios importantes por correo electrónico.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Contacto</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Para preguntas sobre privacidad o ejercer tus derechos:
            </p>
            <ul className="list-none text-gray-600 dark:text-gray-300 space-y-2">
              <li><strong>Email:</strong> privacy@monitorjudicial.com.mx</li>
              <li><strong>Sitio web:</strong> https://www.monitorjudicial.com.mx</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
