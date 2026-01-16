'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, ArrowRight } from 'lucide-react'

const investigacionTools = [
    {
        id: 'antecedentes-legales',
        title: 'Antecedentes Legales',
        description: 'Busca nombres en todos los boletines judiciales del estado.',
        icon: Search,
        href: '/dashboard/investigacion/busquedas-estatales',
    },
    // Future investigation tools can be added here
]

export default function InvestigacionPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Investigación</h1>
                <p className="text-muted-foreground">
                    Herramientas de investigación legal y búsqueda de antecedentes.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {investigacionTools.map((tool) => (
                    <Link key={tool.id} href={tool.href}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <tool.icon className="h-8 w-8 text-primary mb-2" />
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CardTitle>{tool.title}</CardTitle>
                                <CardDescription>{tool.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
