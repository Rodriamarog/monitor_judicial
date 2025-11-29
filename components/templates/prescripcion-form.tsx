'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileText, FileDown, ExternalLink } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { PrescripcionPreview } from './prescripcion-preview'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const formSchema = z.object({
    // Plaintiff Information
    plaintiffName: z.string().min(1, 'Nombre del actor requerido'),
    plaintiffAddress: z.string().min(1, 'Domicilio del actor requerido'),
    authorizedAttorneys: z.string().optional(),

    // Defendant Information
    defendant1Name: z.string().min(1, 'Nombre del primer demandado requerido'),
    defendant1Address: z.string().optional(),
    defendant2Name: z.string().optional(),
    defendant2Address: z.string().optional(),

    // Property Details
    lotNumber: z.string().min(1, 'Número de lote requerido'),
    blockNumber: z.string().min(1, 'Número de manzana requerido'),
    developmentName: z.string().min(1, 'Nombre del desarrollo requerido'),
    propertyLocation: z.string().min(1, 'Ubicación del predio requerida'),
    delegation: z.string().min(1, 'Delegación requerida'),
    propertyArea: z.string().min(1, 'Superficie requerida'),

    // Boundaries
    boundaryNorthwest: z.string().min(1, 'Lindero noroeste requerido'),
    boundarySouthwest: z.string().min(1, 'Lindero suroeste requerido'),
    boundarySoutheast: z.string().min(1, 'Lindero sureste requerido'),
    boundaryNortheast: z.string().min(1, 'Lindero noreste requerido'),

    // Possession Details
    possessionStartDate: z.string().min(1, 'Fecha de inicio de posesión requerida'),
    previousOwner: z.string().min(1, 'Nombre del propietario anterior requerido'),
    purchaseDate: z.string().min(1, 'Fecha de compra requerida'),

    // Registry Information
    registryParty: z.string().min(1, 'Partida de registro requerida'),
    registrySection: z.string().min(1, 'Sección de registro requerida'),
    registryDate: z.string().min(1, 'Fecha de registro requerida'),
    registeredOwner: z.string().min(1, 'Propietario registrado requerido'),

    city: z.string().min(1, 'Ciudad requerida'),
})

type FormValues = z.infer<typeof formSchema>

export function PrescripcionForm() {
    const [isGenerating, setIsGenerating] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            plaintiffName: '',
            plaintiffAddress: '',
            authorizedAttorneys: '',
            defendant1Name: '',
            defendant1Address: '',
            defendant2Name: '',
            defendant2Address: '',
            lotNumber: '',
            blockNumber: '',
            developmentName: '',
            propertyLocation: '',
            delegation: '',
            propertyArea: '',
            boundaryNorthwest: '',
            boundarySouthwest: '',
            boundarySoutheast: '',
            boundaryNortheast: '',
            possessionStartDate: '',
            previousOwner: '',
            purchaseDate: '',
            registryParty: '',
            registrySection: '',
            registryDate: '',
            registeredOwner: '',
            city: 'Tijuana, B.C.',
        },
    })

    const watchedValues = form.watch()

    const generateDocument = async (data: FormValues) => {
        setIsGenerating(true)
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // CARÁTULA
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: data.plaintiffName.toUpperCase(), bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "VS.", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: data.defendant1Name.toUpperCase(), bold: true }),
                            ],
                        }),
                        ...(data.defendant2Name ? [
                            new Paragraph({ text: "" }),
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({ text: data.defendant2Name.toUpperCase(), bold: true }),
                                ],
                            })
                        ] : []),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "JUICIO ORDINARIO CIVIL", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "I N I C I O", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // Judge Address
                        new Paragraph({
                            children: [
                                new TextRun({ text: "C. JUEZ DE PRIMERA INSTANCIA DE LO CIVIL EN TURNO", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "P R E S E N T E.-", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Introduction
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: data.plaintiffName.toUpperCase(), bold: true }),
                                new TextRun(", mexicano, mayor de edad, por mi propio derecho, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el despacho ubicado en "),
                                new TextRun({ text: data.plaintiffAddress, bold: true }),
                                data.authorizedAttorneys ? new TextRun(` y designando como mis Abogados Procuradores con la totalidad de facultades contenidas en el artículo 46 del Código de Procedimientos Civiles vigente en el Estado, a los CC. Licenciados ${data.authorizedAttorneys}`) : new TextRun(""),
                                new TextRun(", ante Usted con el debido respeto comparecemos a exponer:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Demand Statement
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Que en los términos del presente escrito, "),
                                new TextRun({ text: "EN LA VIA ORDINARIA CIVIL", bold: true }),
                                new TextRun(" y en ejercicio de la "),
                                new TextRun({ text: "Acción de Prescripción Adquisitiva", bold: true }),
                                new TextRun(", vengo a demandar al Sr. "),
                                new TextRun({ text: data.defendant1Name.toUpperCase(), bold: true }),
                                data.defendant1Address ? new TextRun(`, quien tiene su domicilio en ${data.defendant1Address}`) : new TextRun(""),
                                new TextRun(" de esta Ciudad, de quien reclamo las siguientes:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PRESTACIONES
                        new Paragraph({
                            children: [
                                new TextRun({ text: "P R E S T A C I O N E S:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PRESTACION A
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "A).- ", bold: true }),
                                new TextRun(`Del Sr. ${data.defendant1Name.toUpperCase()}, demando que se declare por sentencia firme que me he convertido en propietario del lote de terreno No. ${data.lotNumber} de la manzana ${data.blockNumber} del desarrollo denominado ${data.developmentName.toUpperCase()}, siendo parte de un predio mayor ${data.propertyLocation} en la delegación de ${data.delegation} de esta Ciudad, mismo que cuenta con una superficie total de ${data.propertyArea} y las siguientes medidas y colindancias:`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Boundaries
                        new Paragraph({
                            children: [
                                new TextRun({ text: "AL NOROESTE.- ", bold: true }),
                                new TextRun(data.boundaryNorthwest),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "AL SUROESTE.- ", bold: true }),
                                new TextRun(data.boundarySouthwest),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "AL SURESTE.- ", bold: true }),
                                new TextRun(data.boundarySoutheast),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "AL NORESTE.- ", bold: true }),
                                new TextRun(data.boundaryNortheast),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PRESTACION B
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "B).- ", bold: true }),
                                new TextRun(`Del Sr. ${data.registeredOwner.toUpperCase()} demando la cancelación parcial de la Partida número ${data.registryParty} de la ${data.registrySection} de fecha ${data.registryDate}, bajo la cual se inscribió el inmueble descrito en el inciso inmediato anterior favor de los demandados.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // HECHOS Header
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Fundo la presente demanda en la siguiente relación de hechos y preceptos legales aplicables."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "H E C H O S:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 1
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "1.- ", bold: true }),
                                new TextRun(`Con fecha ${data.possessionStartDate} el suscrito promovente entré a poseer el bien inmueble materia del presente juicio y consistente en el lote de terreno No. ${data.lotNumber} de la manzana ${data.blockNumber} del desarrollo ${data.developmentName.toUpperCase()} de esta Ciudad de ${data.city}, de la Delegación de ${data.delegation} de esta Ciudad, mismo que cuenta con una superficie total de ${data.propertyArea} y las medidas y colindancias ya señaladas.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 2
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "2.- ", bold: true }),
                                new TextRun(`Es preciso mencionar que el origen de mi posesión proviene de la celebración de un contrato de compraventa que llevé a cabo con su anterior propietario y posesionario el Sr. ${data.previousOwner.toUpperCase()}, en esa misma fecha, es decir el ${data.purchaseDate}, tal y como se acredita fehacientemente mediante la exhibición del documento que lo contiene y que acompaño a la presente demanda como documento base de la acción, mencionando que oportunamente cubrí íntegramente el precio pactado en dicha operación compraventa.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 3
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "3.- ", bold: true }),
                                new TextRun(`Cabe señalarse que a su vez mi causante el Sr. ${data.previousOwner.toUpperCase()} había adquirido del ahora demandado SR. ${data.registeredOwner.toUpperCase()} el bien inmueble que nos ocupa, es decir, en dicha fecha los demandados le vendieron, cedieron y traspasaron a mi causante en mención el lote de terreno materia de este juicio, de quien recibieron oportunamente el pago del precio convenido y así mismo le entregaron al Sr. ${data.plaintiffName.toUpperCase()} la posesión material y jurídica del citado inmueble para todos los efectos legales conducentes.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 4
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "4.- ", bold: true }),
                                new TextRun(`Al igual que mi causante, desde la fecha indicada en el punto de hechos número 1, es decir, desde el ${data.possessionStartDate}, he continuado poseyendo el citado lote de terreno que nos ocupa en forma pública, pacífica, continua, de buena fe y en concepto de propietaria.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 5
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "5.- ", bold: true }),
                                new TextRun(`Finalmente, al tratar de legalizar la posesión que ostento sobre el inmueble materia del presente juicio, a fin de obtener mi título de propiedad, se me informó en el Registro Público de la Propiedad y de Comercio, que la fracción que pretendo prescribir se encuentra inscrito a nombre del ahora demandado Sr. ${data.registeredOwner.toUpperCase()} ${data.propertyLocation} de esta Ciudad, según se aprecia en la Partida cuya cancelación se reclama en el inciso B) del capítulo de prestaciones de la presente demanda, razón por la que me veo en la imperiosa necesidad de promoverles el juicio de prescripción que nos trata, acordes con el numeral 1143 del Código Civil vigente en el Estado para que mediante sentencia definitiva se me declare propietaria del mismo, en base a la posesión que ostento y a la de mi causante que aprovecho en los términos del artículo 1136 del citado cuerpo de leyes, ordenando su inscripción en los libros correspondientes de dicha oficina Registradora.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // CAPITULO DE DERECHO
                        new Paragraph({
                            children: [
                                new TextRun({ text: "CAPITULO DE DERECHO.", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Son aplicables en cuanto al fondo las disposiciones contenidas en los artículos 781, 782, 785, 789, 792, 793, 794, 797, 798, 799, 814, 815, 816, 817, 818, del 1122 al 1144 y demás relativos del Código Civil en vigor."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("En cuanto al procedimiento se rige en lo dispuesto por los artículos del 256 al 262 y demás relativos del Código de Procedimientos Civiles vigente en el Estado."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PETITIONS
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Por lo expuesto y fundado, a Usted C. JUEZ atentamente pido se sirva:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "PRIMERO.- ", bold: true }),
                                new TextRun(`Tenerme por presentada con este escrito y documentos anexos, demandado al Sr. ${data.defendant1Name.toUpperCase()}, por las prestaciones ya indicadas.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "SEGUNDO.- ", bold: true }),
                                new TextRun("Con las copias simples, ordenar se corra traslado al demandado, emplazándolos para que dentro del término legal manifieste lo que a su derecho convenga."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "TERCERO.- ", bold: true }),
                                new TextRun("En su oportunidad, pronunciar sentencia definitiva en la que se nos declare propietarios del inmueble de referencia."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // Footer
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "PROTESTO LO NECESARIO", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun(`${data.city}, al día de su presentación`),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // Signature
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun("_________________________________"),
                            ],
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: data.plaintiffName.toUpperCase(), bold: true }),
                            ],
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun("ABOGADO PROCURADOR"),
                            ],
                        }),
                    ]
                }]
            })

            const blob = await Packer.toBlob(doc)
            const fileName = `Prescripcion_${data.plaintiffName.replace(/\s+/g, '_')}.docx`
            saveAs(blob, fileName)

            toast.success('Documento DOCX generado exitosamente')
        } catch (error) {
            console.error('Error generating document:', error)
            toast.error('Error al generar el documento')
        } finally {
            setIsGenerating(false)
        }
    }

    const generatePDF = async (data: FormValues) => {
        setIsGenerating(true)
        try {
            const previewElement = document.querySelector('.live-preview-content') as HTMLElement
            if (!previewElement) {
                toast.error('No se pudo encontrar el contenido para generar el PDF')
                return
            }

            const canvas = await html2canvas(previewElement, {
                scale: 2,
                useCORS: true,
                logging: false,
            })

            const imgWidth = 215.9
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter',
            })

            const imgData = canvas.toDataURL('image/png')
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

            const fileName = `Prescripcion_${data.plaintiffName.replace(/\s+/g, '_')}.pdf`
            pdf.save(fileName)

            toast.success('PDF generado exitosamente')
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error('Error al generar el PDF')
        } finally {
            setIsGenerating(false)
        }
    }

    const openInGoogleDocs = async () => {
        const data = form.getValues()
        const validation = formSchema.safeParse(data)

        if (!validation.success) {
            toast.error('Por favor completa todos los campos requeridos')
            return
        }

        setIsGenerating(true)
        try {
            await generateDocument(data)

            setTimeout(() => {
                window.open('https://docs.google.com/document/u/0/create', '_blank')
                toast.success('Documento descargado. Súbelo a Google Docs desde la ventana abierta.')
            }, 500)
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al abrir Google Docs')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex gap-6 h-full">
            {/* Form Section - Left Side */}
            <Card className="flex-1 flex flex-col h-full">
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Prescripción Adquisitiva</h2>
                            <p className="text-sm text-muted-foreground">
                                Completa los datos para generar la demanda
                            </p>
                        </div>

                        {/* Plaintiff Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información del Actor</h3>

                            <div className="space-y-2">
                                <Label htmlFor="plaintiffName">Nombre del Actor</Label>
                                <Input
                                    id="plaintiffName"
                                    {...form.register('plaintiffName')}
                                    placeholder="Ej. Pedro Valles Limon"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="plaintiffAddress">Domicilio del Actor</Label>
                                <Input
                                    id="plaintiffAddress"
                                    {...form.register('plaintiffAddress')}
                                    placeholder="Ej. Ave. Paseo Centenario #10310, Noveno Piso"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="authorizedAttorneys">Abogados Procuradores (Opcional)</Label>
                                <Textarea
                                    id="authorizedAttorneys"
                                    {...form.register('authorizedAttorneys')}
                                    placeholder="Ej. ARMANDO Y CARLOS ATILANO PEÑA, ABIGAIL DIAZ MENDIVIL..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Defendant Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información de Demandados</h3>

                            <div className="space-y-2">
                                <Label htmlFor="defendant1Name">Primer Demandado</Label>
                                <Input
                                    id="defendant1Name"
                                    {...form.register('defendant1Name')}
                                    placeholder="Ej. Juan Manuel Negrete Galvan"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defendant1Address">Domicilio del Primer Demandado (Opcional)</Label>
                                <Input
                                    id="defendant1Address"
                                    {...form.register('defendant1Address')}
                                    placeholder="Domicilio"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defendant2Name">Segundo Demandado (Opcional)</Label>
                                <Input
                                    id="defendant2Name"
                                    {...form.register('defendant2Name')}
                                    placeholder="Ej. Antonio Negrete Duarte"
                                />
                            </div>
                        </div>

                        {/* Property Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Datos del Inmueble</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lotNumber">Número de Lote</Label>
                                    <Input
                                        id="lotNumber"
                                        {...form.register('lotNumber')}
                                        placeholder="Ej. 7"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="blockNumber">Número de Manzana</Label>
                                    <Input
                                        id="blockNumber"
                                        {...form.register('blockNumber')}
                                        placeholder="Ej. 2"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="developmentName">Nombre del Desarrollo</Label>
                                <Input
                                    id="developmentName"
                                    {...form.register('developmentName')}
                                    placeholder="Ej. BRISA MARINA"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="propertyLocation">Ubicación del Predio Mayor</Label>
                                <Input
                                    id="propertyLocation"
                                    {...form.register('propertyLocation')}
                                    placeholder="Ej. ubicado al noroeste de Tijuana y al Sur de la colonia Lázaro Cárdenas"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="delegation">Delegación</Label>
                                <Input
                                    id="delegation"
                                    {...form.register('delegation')}
                                    placeholder="Ej. San Antonio de los Buenos"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="propertyArea">Superficie</Label>
                                <Input
                                    id="propertyArea"
                                    {...form.register('propertyArea')}
                                    placeholder="Ej. 160.00 metros cuadrados"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Linderos y Colindancias</Label>
                                <Input
                                    {...form.register('boundaryNorthwest')}
                                    placeholder="Noroeste: Ej. En 20.00 Mts. con LOTE 6"
                                />
                                <Input
                                    {...form.register('boundarySouthwest')}
                                    placeholder="Suroeste: Ej. En 8.00 Mts. con Calle Vista Coronado"
                                />
                                <Input
                                    {...form.register('boundarySoutheast')}
                                    placeholder="Sureste: Ej. En 20.00 Mts. con LOTE 8"
                                />
                                <Input
                                    {...form.register('boundaryNortheast')}
                                    placeholder="Noreste: Ej. En 8.00 Mts. Con Area de Talud"
                                />
                            </div>
                        </div>

                        {/* Possession Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Datos de Posesión</h3>

                            <div className="space-y-2">
                                <Label htmlFor="possessionStartDate">Fecha de Inicio de Posesión</Label>
                                <Input
                                    id="possessionStartDate"
                                    {...form.register('possessionStartDate')}
                                    placeholder="Ej. 17 de Junio del año 2014"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="previousOwner">Propietario Anterior</Label>
                                <Input
                                    id="previousOwner"
                                    {...form.register('previousOwner')}
                                    placeholder="Ej. Juan Manuel Negrete Galvan"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="purchaseDate">Fecha de Compra</Label>
                                <Input
                                    id="purchaseDate"
                                    {...form.register('purchaseDate')}
                                    placeholder="Ej. 17 de Junio del año 2014"
                                />
                            </div>
                        </div>

                        {/* Registry Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información de Registro</h3>

                            <div className="space-y-2">
                                <Label htmlFor="registryParty">Número de Partida</Label>
                                <Input
                                    id="registryParty"
                                    {...form.register('registryParty')}
                                    placeholder="Ej. 50266478"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="registrySection">Sección</Label>
                                    <Input
                                        id="registrySection"
                                        {...form.register('registrySection')}
                                        placeholder="Ej. Sección Civil"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="registryDate">Fecha de Registro</Label>
                                    <Input
                                        id="registryDate"
                                        {...form.register('registryDate')}
                                        placeholder="Ej. 21 de Febrero de 1995"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="registeredOwner">Propietario Registrado</Label>
                                <Input
                                    id="registeredOwner"
                                    {...form.register('registeredOwner')}
                                    placeholder="Ej. Antonio Negrete Duarte"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Ubicación</h3>

                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input
                                    id="city"
                                    {...form.register('city')}
                                    placeholder="Ej. Tijuana, B.C."
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={openInGoogleDocs}
                                variant="outline"
                                disabled={isGenerating}
                                className="cursor-pointer"
                            >
                                {isGenerating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                )}
                                Abrir en Google Docs
                            </Button>
                            <Button
                                onClick={form.handleSubmit(generateDocument)}
                                disabled={isGenerating}
                                className="cursor-pointer"
                            >
                                {isGenerating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileText className="mr-2 h-4 w-4" />
                                )}
                                Generar DOCX
                            </Button>
                            <Button
                                onClick={form.handleSubmit(generatePDF)}
                                disabled={isGenerating}
                                className="cursor-pointer"
                            >
                                {isGenerating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileDown className="mr-2 h-4 w-4" />
                                )}
                                Generar PDF
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Section - Right Side */}
            <Card className="flex-1 flex flex-col h-full">
                <CardContent className="flex-1 overflow-y-auto p-6 pl-7">
                    <PrescripcionPreview data={watchedValues} />
                </CardContent>
            </Card>
        </div>
    )
}
