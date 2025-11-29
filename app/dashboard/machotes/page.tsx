'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ArrowRight } from 'lucide-react'

const templates = [
    {
        id: 'juicio-alimentos',
        title: 'Juicio de Alimentos',
        description: 'Demanda inicial para solicitar pensión alimenticia.',
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
        </div>
    )
}
