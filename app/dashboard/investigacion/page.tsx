'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, History, Search, Car, Receipt, GraduationCap, AlertTriangle, UserCheck, UserPlus, FileText, Building, Briefcase, Users, Banknote, Navigation, Map } from 'lucide-react'

interface Tool {
    id: string
    title: string
    icon: React.ElementType
    href: string
}

interface ToolSection {
    title: string
    tools: Tool[]
}

const investigacionSections: ToolSection[] = [
    {
        title: 'Antecedentes Legales',
        tools: [
            {
                id: 'antecedentes-legales',
                title: 'Búsqueda Estatal',
                icon: Search,
                href: '/dashboard/investigacion/busquedas-estatales',
            },
        ],
    },
    {
        title: 'CURP',
        tools: [
            {
                id: 'curp-validate',
                title: 'Validar CURP',
                icon: UserCheck,
                href: '/dashboard/investigacion/nubarium/curp/validate',
            },
            {
                id: 'curp-generate',
                title: 'Generar CURP',
                icon: UserPlus,
                href: '/dashboard/investigacion/nubarium/curp/generate',
            },
        ],
    },
    {
        title: 'SAT',
        tools: [
            {
                id: 'sat-rfc',
                title: 'Validar RFC',
                icon: Receipt,
                href: '/dashboard/investigacion/nubarium/sat/rfc',
            },
            {
                id: 'sat-get-name',
                title: 'Obtener Nombre de RFC',
                icon: Receipt,
                href: '/dashboard/investigacion/nubarium/sat/get-name',
            },
            {
                id: 'sat-csf-cif',
                title: 'Consultar CSF/CIF',
                icon: FileText,
                href: '/dashboard/investigacion/nubarium/sat/csf-cif',
            },
            {
                id: 'sat-cfdi',
                title: 'Validar CFDI',
                icon: Receipt,
                href: '/dashboard/investigacion/nubarium/sat/cfdi',
            },
            {
                id: 'sat-validate-info',
                title: 'Validar RFC vs Datos',
                icon: Receipt,
                href: '/dashboard/investigacion/nubarium/sat/validate-info',
            },
            {
                id: 'sat-validate-serial',
                title: 'Validar Serial FIEL/CSD',
                icon: FileText,
                href: '/dashboard/investigacion/nubarium/sat/validate-serial',
            },
        ],
    },
    {
        title: 'Listas Negras',
        tools: [
            {
                id: 'sat-69',
                title: 'Lista SAT 69',
                icon: AlertTriangle,
                href: '/dashboard/investigacion/nubarium/sat/69',
            },
            {
                id: 'sat-69b',
                title: 'Lista SAT 69-B',
                icon: AlertTriangle,
                href: '/dashboard/investigacion/nubarium/sat/69b',
            },
            {
                id: 'peps',
                title: 'PEPs y Listas Internacionales',
                icon: Users,
                href: '/dashboard/investigacion/nubarium/lists/peps',
            },
        ],
    },
    {
        title: 'Vehículos',
        tools: [
            {
                id: 'repuve',
                title: 'REPUVE',
                icon: Car,
                href: '/dashboard/investigacion/nubarium/repuve',
            },
        ],
    },
    {
        title: 'Educación',
        tools: [
            {
                id: 'sep-cedula',
                title: 'Cédula Profesional',
                icon: GraduationCap,
                href: '/dashboard/investigacion/nubarium/sep',
            },
        ],
    },
    {
        title: 'Seguridad Social',
        tools: [
            {
                id: 'imss-nss',
                title: 'IMSS - Obtener NSS',
                icon: Briefcase,
                href: '/dashboard/investigacion/nubarium/imss/nss',
            },
            {
                id: 'imss-employment',
                title: 'IMSS - Historial Laboral',
                icon: Briefcase,
                href: '/dashboard/investigacion/nubarium/imss/employment',
            },
            {
                id: 'issste-employment',
                title: 'ISSSTE - Historial Laboral',
                icon: Building,
                href: '/dashboard/investigacion/nubarium/issste/employment',
            },
        ],
    },
    {
        title: 'Inteligencia Geográfica',
        tools: [
            {
                id: 'geo-position',
                title: 'Desde Coordenadas',
                icon: Navigation,
                href: '/dashboard/investigacion/nubarium/geo/analyze-position',
            },
            {
                id: 'geo-address',
                title: 'Desde Dirección',
                icon: Map,
                href: '/dashboard/investigacion/nubarium/geo/analyze-address',
            },
        ],
    },
    {
        title: 'Documentos y Banca',
        tools: [
            {
                id: 'cfe',
                title: 'Validar CFE',
                icon: FileText,
                href: '/dashboard/investigacion/nubarium/documents/cfe',
            },
            {
                id: 'cep',
                title: 'Validar CEP (SPEI)',
                icon: Banknote,
                href: '/dashboard/investigacion/nubarium/banking/cep',
            },
        ],
    },
    {
        title: 'Historial',
        tools: [
            {
                id: 'historial-reportes',
                title: 'Historial de Reportes',
                icon: History,
                href: '/dashboard/investigacion/historial',
            },
        ],
    },
]

export default function InvestigacionPage() {
    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Investigación</h1>
                <p className="text-muted-foreground">
                    Herramientas de investigación legal y búsqueda de antecedentes.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {investigacionSections.map((section) => (
                    <Card key={section.title} className="overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b">
                            <h2 className="text-base font-semibold text-foreground">
                                {section.title}
                            </h2>
                        </div>
                        <div className="p-4">
                            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                                {section.tools.map((tool) => (
                                    <Link key={tool.id} href={tool.href}>
                                        <div className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer">
                                            <tool.icon className="h-5 w-5 text-primary flex-shrink-0" />
                                            <span className="text-sm font-medium flex-1 min-w-0 truncate">
                                                {tool.title}
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
