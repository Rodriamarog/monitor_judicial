'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, History, Search, IdCard, Car, Receipt, GraduationCap, MapPin, AlertTriangle, Building2 } from 'lucide-react'

const investigacionTools = [
    {
        id: 'antecedentes-legales',
        title: 'Antecedentes Legales',
        description: 'Busca nombres en todos los boletines judiciales del estado.',
        icon: Search,
        href: '/dashboard/investigacion/busquedas-estatales',
    },
    {
        id: 'historial-reportes',
        title: 'Historial de Reportes',
        description: 'Consulta y descarga reportes generados anteriormente.',
        icon: History,
        href: '/dashboard/investigacion/historial',
    },
    // Nubarium Services
    {
        id: 'curp-validation',
        title: 'Validación CURP',
        description: 'Valida o genera CURP contra el registro nacional RENAPO.',
        icon: IdCard,
        href: '/dashboard/investigacion/nubarium/curp',
    },
    {
        id: 'repuve',
        title: 'REPUVE - Vehículos',
        description: 'Consulta registro vehicular por VIN, NIC o placas.',
        icon: Car,
        href: '/dashboard/investigacion/nubarium/repuve',
    },
    {
        id: 'sep-cedula',
        title: 'Cédula Profesional',
        description: 'Valida cédulas profesionales en el registro SEP.',
        icon: GraduationCap,
        href: '/dashboard/investigacion/nubarium/sep',
    },
    {
        id: 'geo-insights',
        title: 'Inteligencia Geográfica',
        description: 'Análisis de marginalización y geocodificación de direcciones.',
        icon: MapPin,
        href: '/dashboard/investigacion/nubarium/geo',
    },
    {
        id: 'sat-services',
        title: 'Servicios SAT',
        description: 'Validación de RFC, CFDI, certificados y opiniones fiscales.',
        icon: Receipt,
        href: '/dashboard/investigacion/nubarium/sat',
    },
    {
        id: 'blocklists',
        title: 'Listas Negras',
        description: 'Consulta listas SAT 69/69-B, PEPs y sanciones internacionales.',
        icon: AlertTriangle,
        href: '/dashboard/investigacion/nubarium/blocklists',
    },
    {
        id: 'imss-issste',
        title: 'IMSS / ISSSTE',
        description: 'Consulta NSS e historial laboral (servicios webhook).',
        icon: Building2,
        href: '/dashboard/investigacion/nubarium/social-security',
    },
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
