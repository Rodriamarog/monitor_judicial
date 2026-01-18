'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

const templates = [
    {
        id: 'juicio-alimentos',
        title: 'Juicio de Alimentos',
        description: 'Demanda inicial para solicitar pensión alimenticia.',
        icon: FileText,
    },
    {
        id: 'juicio-plenario-posesion',
        title: 'Juicio Plenario de Posesión',
        description: 'Demanda para recuperar la posesión de un inmueble.',
        icon: FileText,
    },
    {
        id: 'jurisdiccion-concubinato',
        title: 'Jurisdicción Voluntaria Concubinato',
        description: 'Diligencias para acreditar relación de concubinato.',
        icon: FileText,
    },
    {
        id: 'ofrecimiento-pruebas',
        title: 'Ofrecimiento de Pruebas',
        description: 'Ofrecimiento de pruebas para juicio en curso.',
        icon: FileText,
    },
    {
        id: 'prescripcion',
        title: 'Prescripción',
        description: 'Demanda de prescripción adquisitiva de propiedad.',
        icon: FileText,
    },
    // Future templates can be added here
]

export default function MachotesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Machotes</h1>
                <p className="text-muted-foreground">
                    Selecciona una plantilla para generar tus documentos legales.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Link key={template.id} href={`/dashboard/machotes/${template.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <template.icon className="h-8 w-8 text-primary mb-2" />
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CardTitle>{template.title}</CardTitle>
                                <CardDescription>{template.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Custom Machote Request Card - Separate Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-dashed border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <Mail className="h-8 w-8 text-primary mb-2" />
                        </div>
                        <CardTitle className="text-primary">¿Necesitas un Machote Personalizado?</CardTitle>
                        <CardDescription className="space-y-3">
                            <p>
                                Solicita una cotización para que nuestro equipo desarrolle un machote personalizado y privado específico para tu cuenta.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                onClick={() => window.location.href = 'mailto:monitorjudicialmx@gmail.com?subject=Solicitud%20de%20Machote%20Personalizado'}
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Solicitar Cotización
                            </Button>
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    )
}
