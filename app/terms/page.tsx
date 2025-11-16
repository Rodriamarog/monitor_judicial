import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos de Servicio | Monitor Judicial PJBC',
  description: 'Términos y condiciones de uso de Monitor Judicial',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Términos de Servicio
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Aceptación de Términos</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Al acceder y usar Monitor Judicial, aceptas estar legalmente obligado por estos términos.
              Si no estás de acuerdo, no uses el servicio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Descripción del Servicio</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Monitor Judicial es un servicio de monitoreo automatizado de boletines judiciales del
              Poder Judicial de Baja California (PJBC). El servicio incluye:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Monitoreo automático de casos en boletines judiciales</li>
              <li>Notificaciones por correo electrónico y WhatsApp</li>
              <li>Sincronización opcional con Google Calendar</li>
              <li>Historial de alertas</li>
              <li>Panel de control para gestionar casos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. Cuenta de Usuario</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Para usar el servicio, debes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Proporcionar información veraz y actualizada</li>
              <li>Mantener la seguridad de tu cuenta</li>
              <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
              <li>Ser responsable de todas las actividades en tu cuenta</li>
              <li>Tener al menos 18 años de edad</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Suscripciones y Pagos</h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">4.1 Planes de Suscripción</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Ofrecemos diferentes planes con límites de casos monitoreados. Los precios están
              disponibles en nuestra página de precios.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">4.2 Facturación</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mb-4">
              <li>Las suscripciones se renuevan automáticamente mensual o anualmente</li>
              <li>Los pagos se procesan a través de Stripe</li>
              <li>Los cargos se realizan al inicio de cada período de facturación</li>
              <li>Todos los precios están en pesos mexicanos (MXN)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">4.3 Cancelaciones</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mb-4">
              <li>Puedes cancelar tu suscripción en cualquier momento</li>
              <li>No ofrecemos reembolsos por períodos parciales</li>
              <li>El servicio continuará hasta el final del período pagado</li>
              <li>Al bajar de plan, si excedes el límite de casos, no recibirás nuevas alertas hasta que reduzcas tus casos monitoreados</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">4.4 Plan Gratuito</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Ofrecemos un plan gratuito limitado. Nos reservamos el derecho de modificar o
              descontinuar el plan gratuito con aviso previo de 30 días.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Uso Aceptable</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No está permitido:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Usar el servicio para actividades ilegales</li>
              <li>Intentar acceder de manera no autorizada al sistema</li>
              <li>Compartir tu cuenta con terceros</li>
              <li>Realizar scraping o automatización no autorizada</li>
              <li>Sobrecargar o interferir con el servicio</li>
              <li>Revender o redistribuir el servicio</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Integración con Google Calendar</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Si conectas tu Google Calendar:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Autorizas a Monitor Judicial para crear y modificar eventos en tu calendario</li>
              <li>Puedes revocar el acceso en cualquier momento desde tu configuración</li>
              <li>La sincronización es opcional y puede desactivarse sin afectar otras funciones</li>
              <li>Google puede tener sus propios términos de servicio que debes aceptar</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Limitaciones del Servicio</h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">7.1 Disponibilidad</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              El servicio se proporciona "tal cual". No garantizamos disponibilidad ininterrumpida,
              aunque nos esforzamos por mantener un servicio confiable.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">7.2 Precisión de Datos</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Monitor Judicial obtiene información de fuentes públicas del PJBC. No somos responsables de:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Errores u omisiones en los boletines judiciales originales</li>
              <li>Retrasos en la publicación de boletines por parte del PJBC</li>
              <li>Cambios en el formato de boletines que afecten temporalmente el monitoreo</li>
              <li>Notificaciones que no se entreguen por problemas de terceros (email, WhatsApp)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Propiedad Intelectual</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              El servicio, software, diseño y contenido son propiedad de Monitor Judicial.
              No se te otorga ninguna licencia excepto para usar el servicio según estos términos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. Limitación de Responsabilidad</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Monitor Judicial no será responsable de:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Daños indirectos, incidentales o consecuentes</li>
              <li>Pérdida de datos, ingresos o oportunidades</li>
              <li>Fallos para recibir alertas críticas</li>
              <li>Decisiones tomadas basándose en la información proporcionada</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mt-4">
              <strong>El servicio es una herramienta de apoyo y no reemplaza la verificación directa
              de información judicial oficial.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Terminación</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Podemos suspender o terminar tu cuenta si:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Violas estos términos</li>
              <li>Realizas actividades fraudulentas</li>
              <li>Tu pago falla repetidamente</li>
              <li>Es requerido por ley</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">11. Cambios a los Términos</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Nos reservamos el derecho de modificar estos términos. Te notificaremos de cambios
              importantes por correo electrónico con 30 días de anticipación.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">12. Ley Aplicable</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Estos términos se rigen por las leyes de México. Cualquier disputa se resolverá
              en los tribunales de Baja California, México.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">13. Contacto</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Para preguntas sobre estos términos:
            </p>
            <ul className="list-none text-gray-600 dark:text-gray-300 space-y-2">
              <li><strong>Email:</strong> legal@monitorjudicial.com.mx</li>
              <li><strong>Sitio web:</strong> https://www.monitorjudicial.com.mx</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
