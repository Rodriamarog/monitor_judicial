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
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Ayuda y Soporte</h1>
          <p className="text-muted-foreground mt-2">
            Estamos aquí para ayudarte
          </p>
        </div>

        {/* Contact Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="w-10 h-10 text-primary" />
              <div>
                <CardTitle className="text-xl">Contacto por Email</CardTitle>
                <CardDescription>Envíanos tus preguntas o comentarios</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Para cualquier duda, sugerencia o soporte técnico, contáctanos al siguiente correo:
            </p>
            <Button variant="default" className="w-full" size="lg" asChild>
              <a href="mailto:monitorjudicialmx@gmail.com">
                <Mail className="w-4 h-4 mr-2" />
                monitorjudicialmx@gmail.com
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
