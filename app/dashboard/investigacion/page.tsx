'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, History, Search, IdCard, Car, Receipt, GraduationCap, MapPin, AlertTriangle, UserCheck, UserPlus, FileText, Building, DollarSign, Briefcase, Users, Banknote, Navigation, Map } from 'lucide-react'

const investigacionTools = [
    {
        id: 'antecedentes-legales',
        title: 'Antecedentes Legales',
        description: 'Busca nombres en todos los boletines judiciales del estado.',
        icon: Search,
        href: '/dashboard/investigacion/busquedas-estatales',
    },
    // Nubarium Services
    {
        id: 'curp-validate',
        title: 'Validar CURP',
        description: 'Valida CURP contra el registro nacional RENAPO.',
        icon: UserCheck,
        href: '/dashboard/investigacion/nubarium/curp/validate',
    },
    {
        id: 'curp-generate',
        title: 'Generar CURP',
        description: 'Genera CURP a partir de datos personales.',
        icon: UserPlus,
        href: '/dashboard/investigacion/nubarium/curp/generate',
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
        href: '/dashboard/investigacion/nubarium/geo/insights',
    },
    {
        id: 'sat-rfc',
        title: 'Validar RFC - SAT',
        description: 'Valida RFC contra el Servicio de Administración Tributaria.',
        icon: Receipt,
        href: '/dashboard/investigacion/nubarium/sat/rfc',
    },
    {
        id: 'sat-get-name',
        title: 'SAT - Obtener Nombre de RFC',
        description: 'Obtiene razón social o nombre a partir de RFC.',
        icon: Receipt,
        href: '/dashboard/investigacion/nubarium/sat/get-name',
    },
    {
        id: 'sat-csf-cif',
        title: 'SAT - Consultar CSF/CIF',
        description: 'Obtiene datos a partir de CSF o CIF y RFC.',
        icon: FileText,
        href: '/dashboard/investigacion/nubarium/sat/csf-cif',
    },
    {
        id: 'sat-cfdi',
        title: 'SAT - Validar CFDI',
        description: 'Valida factura electrónica CFDI.',
        icon: Receipt,
        href: '/dashboard/investigacion/nubarium/sat/cfdi',
    },
    {
        id: 'sat-validate-info',
        title: 'SAT - Validar RFC vs Datos',
        description: 'Valida RFC contra nombre y código postal.',
        icon: Receipt,
        href: '/dashboard/investigacion/nubarium/sat/validate-info',
    },
    {
        id: 'sat-validate-serial',
        title: 'SAT - Validar Serial FIEL/CSD',
        description: 'Valida número de serie de certificado FIEL o CSD.',
        icon: FileText,
        href: '/dashboard/investigacion/nubarium/sat/validate-serial',
    },
    {
        id: 'sat-69',
        title: 'Lista SAT 69',
        description: 'Consulta lista SAT artículo 69.',
        icon: AlertTriangle,
        href: '/dashboard/investigacion/nubarium/sat/69',
    },
    {
        id: 'sat-69b',
        title: 'Lista SAT 69-B',
        description: 'Consulta de contribuyentes presuntos en operaciones inexistentes.',
        icon: AlertTriangle,
        href: '/dashboard/investigacion/nubarium/sat/69b',
    },
    {
        id: 'cfe',
        title: 'Validar CFE',
        description: 'Valida comprobante de domicilio CFE.',
        icon: FileText,
        href: '/dashboard/investigacion/nubarium/documents/cfe',
    },
    {
        id: 'imss-nss',
        title: 'IMSS - Obtener NSS',
        description: 'Obtiene Número de Seguro Social (webhook).',
        icon: Briefcase,
        href: '/dashboard/investigacion/nubarium/imss/nss',
    },
    {
        id: 'imss-employment',
        title: 'IMSS - Historial Laboral',
        description: 'Obtiene historial laboral IMSS (webhook).',
        icon: Briefcase,
        href: '/dashboard/investigacion/nubarium/imss/employment',
    },
    {
        id: 'issste-employment',
        title: 'ISSSTE - Historial Laboral',
        description: 'Obtiene historial laboral ISSSTE (webhook).',
        icon: Building,
        href: '/dashboard/investigacion/nubarium/issste/employment',
    },
    {
        id: 'peps',
        title: 'PEPs y Listas Internacionales',
        description: 'Consulta Politically Exposed Persons y listas negras.',
        icon: Users,
        href: '/dashboard/investigacion/nubarium/lists/peps',
    },
    {
        id: 'cep',
        title: 'Validar CEP (SPEI)',
        description: 'Valida transferencia SPEI.',
        icon: Banknote,
        href: '/dashboard/investigacion/nubarium/banking/cep',
    },
    {
        id: 'geo-position',
        title: 'Geo - Desde Coordenadas',
        description: 'Análisis geográfico desde coordenadas (lat/lng).',
        icon: Navigation,
        href: '/dashboard/investigacion/nubarium/geo/analyze-position',
    },
    {
        id: 'geo-address',
        title: 'Geo - Desde Dirección',
        description: 'Análisis geográfico desde dirección.',
        icon: Map,
        href: '/dashboard/investigacion/nubarium/geo/analyze-address',
    },
    {
        id: 'historial-reportes',
        title: 'Historial de Reportes',
        description: 'Consulta y descarga reportes generados anteriormente.',
        icon: History,
        href: '/dashboard/investigacion/historial',
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
