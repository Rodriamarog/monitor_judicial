'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    Search,
    FileText,
    Users,
    AlertTriangle,
    Car,
    GraduationCap,
    Building2,
    MapPin,
    Shield,
    ArrowRight,
    Receipt,
    UserCheck,
    UserPlus,
    Briefcase,
    Banknote,
    Navigation,
    Map,
    History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Tool {
    id: string
    name: string
    description: string
    details: string
    href: string
}

interface Category {
    id: string
    title: string
    description: string
    icon: LucideIcon
    color: 'blue' | 'purple' | 'orange' | 'red' | 'cyan' | 'green' | 'teal' | 'amber' | 'indigo' | 'slate'
    tools: Tool[]
}

const categories: Category[] = [
    {
        id: 'antecedentes',
        title: 'Antecedentes Legales',
        description: 'Búsqueda de registros legales estatales',
        icon: Shield,
        color: 'blue',
        tools: [
            {
                id: 'antecedentes-legales',
                name: 'Búsqueda Estatal',
                description: 'Consulta antecedentes por estado',
                details: 'Accede a bases de datos estatales para verificar antecedentes penales, civiles y administrativos de personas físicas en todo el territorio nacional.',
                href: '/dashboard/investigacion/busquedas-estatales',
            },
        ],
    },
    {
        id: 'curp',
        title: 'CURP',
        description: 'Validación y generación de CURP',
        icon: Users,
        color: 'purple',
        tools: [
            {
                id: 'curp-validate',
                name: 'Validar CURP',
                description: 'Verificar autenticidad de CURP',
                details: 'Confirma que una CURP es válida y está registrada en la base de datos oficial de RENAPO. Incluye verificación de datos personales asociados.',
                href: '/dashboard/investigacion/nubarium/curp/validate',
            },
            {
                id: 'curp-generate',
                name: 'Generar CURP',
                description: 'Obtener CURP desde datos personales',
                details: 'Genera la CURP de una persona a partir de sus datos personales: nombre completo, fecha de nacimiento, sexo y entidad federativa.',
                href: '/dashboard/investigacion/nubarium/curp/generate',
            },
        ],
    },
    {
        id: 'sat',
        title: 'SAT',
        description: 'Herramientas del Servicio de Administración Tributaria',
        icon: Receipt,
        color: 'orange',
        tools: [
            {
                id: 'sat-rfc',
                name: 'Validar RFC',
                description: 'Verificar RFC en el SAT',
                details: 'Valida que un RFC esté registrado ante el SAT y verifica su estatus fiscal actual, incluyendo si está activo o suspendido.',
                href: '/dashboard/investigacion/nubarium/sat/rfc',
            },
            {
                id: 'sat-get-name',
                name: 'Obtener Nombre de RFC',
                description: 'Consultar nombre asociado',
                details: 'Obtén el nombre o razón social registrada para un RFC específico directamente de la base de datos del SAT.',
                href: '/dashboard/investigacion/nubarium/sat/get-name',
            },
            {
                id: 'sat-csf-cif',
                name: 'Consultar CSF/CIF',
                description: 'Constancia de situación fiscal',
                details: 'Consulta la Constancia de Situación Fiscal de un contribuyente, incluyendo régimen fiscal, obligaciones y domicilio fiscal.',
                href: '/dashboard/investigacion/nubarium/sat/csf-cif',
            },
            {
                id: 'sat-cfdi',
                name: 'Validar CFDI',
                description: 'Verificar facturas electrónicas',
                details: 'Verifica la autenticidad de un Comprobante Fiscal Digital por Internet (CFDI) y su estatus de cancelación.',
                href: '/dashboard/investigacion/nubarium/sat/cfdi',
            },
            {
                id: 'sat-validate-info',
                name: 'Validar RFC vs Datos',
                description: 'Comparar RFC con información',
                details: 'Compara un RFC contra datos personales para verificar que correspondan a la misma persona o entidad.',
                href: '/dashboard/investigacion/nubarium/sat/validate-info',
            },
            {
                id: 'sat-validate-serial',
                name: 'Validar Serial FIEL/CSD',
                description: 'Verificar certificados',
                details: 'Valida el número de serie de certificados FIEL o CSD para confirmar su vigencia y autenticidad.',
                href: '/dashboard/investigacion/nubarium/sat/validate-serial',
            },
        ],
    },
    {
        id: 'listas-negras',
        title: 'Listas Negras',
        description: 'Consulta de listas de riesgo y sanciones',
        icon: AlertTriangle,
        color: 'red',
        tools: [
            {
                id: 'sat-69',
                name: 'Lista SAT 69',
                description: 'Contribuyentes incumplidos',
                details: 'Consulta la lista de contribuyentes que tienen créditos fiscales firmes, condonados o cancelados por falta de pago.',
                href: '/dashboard/investigacion/nubarium/sat/69',
            },
            {
                id: 'sat-69b',
                name: 'Lista SAT 69-B',
                description: 'Operaciones simuladas',
                details: 'Verifica si una persona o empresa está en la lista de contribuyentes con operaciones presuntamente inexistentes (factureras).',
                href: '/dashboard/investigacion/nubarium/sat/69b',
            },
            {
                id: 'peps',
                name: 'PEPs y Listas Internacionales',
                description: 'Personas expuestas políticamente',
                details: 'Búsqueda en listas internacionales de PEPs, sanciones OFAC, listas de la ONU y otras bases de datos de cumplimiento.',
                href: '/dashboard/investigacion/nubarium/lists/peps',
            },
        ],
    },
    {
        id: 'vehiculos',
        title: 'Vehículos',
        description: 'Registro Público Vehicular',
        icon: Car,
        color: 'cyan',
        tools: [
            {
                id: 'repuve',
                name: 'REPUVE',
                description: 'Consultar estatus vehicular',
                details: 'Verifica el estatus de un vehículo en el Registro Público Vehicular: robo, pérdida total, gravámenes y restricciones legales.',
                href: '/dashboard/investigacion/nubarium/repuve',
            },
        ],
    },
    {
        id: 'educacion',
        title: 'Educación',
        description: 'Verificación de documentos académicos',
        icon: GraduationCap,
        color: 'green',
        tools: [
            {
                id: 'sep-cedula',
                name: 'Cédula Profesional',
                description: 'Validar cédula profesional',
                details: 'Verifica la autenticidad de una cédula profesional en el Registro Nacional de Profesionistas de la SEP.',
                href: '/dashboard/investigacion/nubarium/sep',
            },
        ],
    },
    {
        id: 'seguridad-social',
        title: 'Seguridad Social',
        description: 'IMSS e ISSSTE',
        icon: Building2,
        color: 'teal',
        tools: [
            {
                id: 'imss-nss',
                name: 'IMSS - Obtener NSS',
                description: 'Número de seguridad social',
                details: 'Consulta el Número de Seguridad Social de una persona a partir de su CURP en la base de datos del IMSS.',
                href: '/dashboard/investigacion/nubarium/imss/nss',
            },
            {
                id: 'imss-employment',
                name: 'IMSS - Historial Laboral',
                description: 'Semanas cotizadas IMSS',
                details: 'Obtén el historial de semanas cotizadas, patrones y periodos de trabajo registrados ante el IMSS.',
                href: '/dashboard/investigacion/nubarium/imss/employment',
            },
            {
                id: 'issste-employment',
                name: 'ISSSTE - Historial Laboral',
                description: 'Historial en ISSSTE',
                details: 'Consulta el historial laboral de trabajadores del sector público registrados en el ISSSTE.',
                href: '/dashboard/investigacion/nubarium/issste/employment',
            },
        ],
    },
    {
        id: 'inteligencia-geografica',
        title: 'Inteligencia Geográfica',
        description: 'Análisis de ubicación y marginalización',
        icon: MapPin,
        color: 'amber',
        tools: [
            {
                id: 'geo-insights',
                name: 'Análisis de Marginalización',
                description: 'Datos CONAPO y SEPOMEX',
                details: 'Obtén información de marginalización CONAPO, datos SEPOMEX y análisis geográfico completo desde dirección o coordenadas.',
                href: '/dashboard/investigacion/nubarium/geo/insights',
            },
            {
                id: 'geo-position',
                name: 'Desde Coordenadas',
                description: 'Buscar por lat/long',
                details: 'Obtén información detallada de una ubicación a partir de coordenadas geográficas: dirección, código postal, colonias cercanas.',
                href: '/dashboard/investigacion/nubarium/geo/analyze-position',
            },
            {
                id: 'geo-address',
                name: 'Desde Dirección',
                description: 'Buscar por dirección física',
                details: 'Geocodifica una dirección para obtener coordenadas exactas e información geográfica del área.',
                href: '/dashboard/investigacion/nubarium/geo/analyze-address',
            },
        ],
    },
    {
        id: 'documentos-banca',
        title: 'Documentos y Banca',
        description: 'Validación de documentos y transacciones',
        icon: FileText,
        color: 'indigo',
        tools: [
            {
                id: 'cfe',
                name: 'Validar CFE',
                description: 'Comprobante de domicilio',
                details: 'Valida comprobantes de domicilio de CFE contra los registros oficiales.',
                href: '/dashboard/investigacion/nubarium/documents/cfe',
            },
            {
                id: 'cep',
                name: 'Validar CEP (SPEI)',
                description: 'Transferencias bancarias',
                details: 'Verifica la autenticidad de transferencias SPEI mediante el Certificado Electrónico de Pago (CEP).',
                href: '/dashboard/investigacion/nubarium/banking/cep',
            },
        ],
    },
    {
        id: 'historial',
        title: 'Historial',
        description: 'Reportes generados',
        icon: History,
        color: 'slate',
        tools: [
            {
                id: 'historial-reportes',
                name: 'Historial de Reportes',
                description: 'Consultar reportes previos',
                details: 'Accede a todos los reportes que has generado anteriormente. Descarga PDFs y consulta resultados históricos.',
                href: '/dashboard/investigacion/historial',
            },
        ],
    },
]

const colorClasses = {
    blue: {
        icon: 'bg-blue-500/10 text-blue-400',
        badge: 'bg-blue-500/10 text-blue-400',
    },
    purple: {
        icon: 'bg-purple-500/10 text-purple-400',
        badge: 'bg-purple-500/10 text-purple-400',
    },
    orange: {
        icon: 'bg-orange-500/10 text-orange-400',
        badge: 'bg-orange-500/10 text-orange-400',
    },
    red: {
        icon: 'bg-red-500/10 text-red-400',
        badge: 'bg-red-500/10 text-red-400',
    },
    cyan: {
        icon: 'bg-cyan-500/10 text-cyan-400',
        badge: 'bg-cyan-500/10 text-cyan-400',
    },
    green: {
        icon: 'bg-green-500/10 text-green-400',
        badge: 'bg-green-500/10 text-green-400',
    },
    teal: {
        icon: 'bg-teal-500/10 text-teal-400',
        badge: 'bg-teal-500/10 text-teal-400',
    },
    amber: {
        icon: 'bg-amber-500/10 text-amber-400',
        badge: 'bg-amber-500/10 text-amber-400',
    },
    indigo: {
        icon: 'bg-indigo-500/10 text-indigo-400',
        badge: 'bg-indigo-500/10 text-indigo-400',
    },
    slate: {
        icon: 'bg-slate-500/10 text-slate-400',
        badge: 'bg-slate-500/10 text-slate-400',
    },
}

export default function InvestigacionPage() {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredCategories = categories.filter(
        (category) =>
            category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.tools.some(
                (tool) =>
                    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tool.details.toLowerCase().includes(searchQuery.toLowerCase())
            )
    )

    // Get default open items (all categories when searching)
    const defaultOpenItems = searchQuery ? filteredCategories.map((c) => c.id) : []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Investigación</h1>
                    <p className="text-muted-foreground">
                        Herramientas de investigación legal y búsqueda de antecedentes
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar herramienta..."
                        className="w-64 pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div>
                <Accordion type="multiple" defaultValue={defaultOpenItems} className="space-y-3">
                    {filteredCategories.map((category) => {
                        const Icon = category.icon
                        const colors = colorClasses[category.color]

                        return (
                            <AccordionItem
                                key={category.id}
                                value={category.id}
                                className="border rounded-xl bg-card overflow-hidden"
                            >
                                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-accent/50 transition-colors [&[data-state=open]]:border-b">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                                colors.icon
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold">{category.title}</h3>
                                                <span
                                                    className={cn(
                                                        'text-xs px-2 py-0.5 rounded-full font-medium',
                                                        colors.badge
                                                    )}
                                                >
                                                    {category.tools.length}{' '}
                                                    {category.tools.length === 1 ? 'herramienta' : 'herramientas'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{category.description}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-5 pb-5 pt-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {category.tools.map((tool) => (
                                            <Link key={tool.id} href={tool.href}>
                                                <div className="group text-left p-4 rounded-lg border bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all cursor-pointer h-full">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h4 className="font-medium">{tool.name}</h4>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {tool.description}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                                        {tool.details}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>

                {filteredCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Search className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No se encontraron herramientas</p>
                        <p className="text-sm text-muted-foreground">Intenta con otro término de búsqueda</p>
                    </div>
                )}
            </div>
        </div>
    )
}
