'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  Mail,
  MessageCircle,
  BookOpen,
  Video,
  FileText,
  ExternalLink,
} from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ayuda y Soporte</h1>
        <p className="text-muted-foreground mt-2">
          Encuentra respuestas a tus preguntas y aprende a usar Monitor Judicial
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Mail className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>Contáctanos por correo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:soporte@monitorjudicial.mx">
                soporte@monitorjudicial.mx
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MessageCircle className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Chat en Vivo</CardTitle>
            <CardDescription>Habla con nuestro equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Iniciar Chat
              <Badge variant="secondary" className="ml-2">Próximamente</Badge>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookOpen className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Documentación</CardTitle>
            <CardDescription>Guías y tutoriales</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Ver Documentación
              <Badge variant="secondary" className="ml-2">Próximamente</Badge>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Guía de Inicio Rápido
          </CardTitle>
          <CardDescription>
            Aprende los conceptos básicos de Monitor Judicial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">1. Monitorea tus casos</h3>
              <p className="text-sm text-muted-foreground">
                Agrega expedientes judiciales y recibe notificaciones automáticas sobre actualizaciones.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">2. Genera documentos</h3>
              <p className="text-sm text-muted-foreground">
                Utiliza nuestros machotes para crear documentos legales de forma rápida y eficiente.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">3. Busca jurisprudencia</h3>
              <p className="text-sm text-muted-foreground">
                Accede a miles de tesis y criterios jurisprudenciales de la SCJN.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">4. Asistente Legal IA</h3>
              <p className="text-sm text-muted-foreground">
                Pregunta sobre tesis y obtén respuestas basadas en jurisprudencia mexicana.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Preguntas Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Cómo funciona el monitoreo de casos?</AccordionTrigger>
              <AccordionContent>
                El sistema monitorea automáticamente los expedientes que registres en la plataforma.
                Cuando detectamos una nueva actuación o movimiento, te enviamos una notificación por email.
                Puedes ver todas tus alertas en la sección "Alertas" del menú.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>¿Qué son los machotes?</AccordionTrigger>
              <AccordionContent>
                Los machotes son plantillas de documentos legales que puedes personalizar con tus datos.
                Incluimos diversos tipos de demandas y documentos procesales. Puedes exportarlos a Google Docs
                o descargarlos como PDF.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>¿Cómo funciona el Asistente Legal IA?</AccordionTrigger>
              <AccordionContent>
                El Asistente Legal utiliza inteligencia artificial para buscar en nuestra base de datos
                de tesis jurisprudenciales y proporcionarte respuestas basadas en criterios de la SCJN.
                Puedes hacer preguntas en lenguaje natural y el sistema encontrará las tesis más relevantes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>¿Cómo conecto mi cuenta de Google?</AccordionTrigger>
              <AccordionContent>
                Ve a la sección "Configuración" en el menú lateral. Ahí encontrarás la opción para
                conectar tu cuenta de Google. Esto te permitirá exportar documentos directamente a Google Docs.
                Solo necesitas autorizar el acceso una vez.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>¿Puedo filtrar las búsquedas de tesis?</AccordionTrigger>
              <AccordionContent>
                Sí, tanto en el Buscador de Tesis como en el Asistente Legal IA puedes aplicar filtros
                por materia (Civil, Penal, Laboral, etc.), época, tipo de tesis, instancia y año.
                Esto te ayuda a encontrar resultados más precisos y relevantes para tu caso.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>¿Cuántos casos puedo monitorear?</AccordionTrigger>
              <AccordionContent>
                El número de casos que puedes monitorear depende de tu plan de suscripción.
                Puedes ver los detalles de tu plan actual en la sección "Configuración".
                Si necesitas monitorear más casos, considera actualizar a un plan superior.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recursos Adicionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="https://www.scjn.gob.mx" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Suprema Corte de Justicia de la Nación
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="https://www.tjbc.gob.mx" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Tribunal Superior de Justicia de BC
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
