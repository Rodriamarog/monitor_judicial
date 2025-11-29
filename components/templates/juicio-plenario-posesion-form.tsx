'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Loader2, FileText, FileDown, ExternalLink } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { JuicioPlenarioPosesionPreview } from './juicio-plenario-posesion-preview'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const formSchema = z.object({
    actorNames: z.array(z.object({
        name: z.string().min(1, 'Nombre requerido'),
    })).min(1, 'Al menos un actor es requerido'),
    defendantName: z.string().min(1, 'Nombre del demandado requerido'),
    actorAddress: z.string().min(1, 'Domicilio del actor requerido'),
    defendantAddress: z.string().min(1, 'Domicilio del demandado requerido'),
    authorizedAttorneys: z.string().optional(),

    // Property Details
    propertyLotNumber: z.string().min(1, 'Número de lote requerido'),
    propertyBlock: z.string().min(1, 'Manzana requerida'),
    propertyNeighborhood: z.string().min(1, 'Colonia requerida'),
    propertyDelegation: z.string().min(1, 'Delegación requerida'),
    propertyCity: z.string().min(1, 'Ciudad requerida'),
    propertyArea: z.string().min(1, 'Superficie requerida'),
    propertyBoundaries: z.object({
        north: z.string().min(1, 'Lindero norte requerido'),
        south: z.string().min(1, 'Lindero sur requerido'),
        east: z.string().min(1, 'Lindero este requerido'),
        west: z.string().min(1, 'Lindero oeste requerido'),
    }),

    // Acquisition Details
    acquisitionMethod: z.string().min(1, 'Método de adquisición requerido'),
    courtName: z.string().min(1, 'Nombre del juzgado requerido'),
    caseNumber: z.string().min(1, 'Número de expediente requerido'),
    sentenceDate: z.string().min(1, 'Fecha de sentencia requerida'),
    possessionStartDate: z.string().min(1, 'Fecha de inicio de posesión requerida'),
    purchaseContractDate: z.string().optional(),
    previousOwner: z.string().optional(),

    // Registry Information
    registryNumber: z.string().min(1, 'Número de registro requerido'),
    registrySection: z.string().min(1, 'Sección de registro requerida'),
    registryDate: z.string().min(1, 'Fecha de registro requerida'),

    // Dispossession Details
    relationshipToDefendant: z.string().min(1, 'Relación con demandado requerida'),
    dispossessionDate: z.string().min(1, 'Fecha de despojo requerida'),
    dispossessionCircumstances: z.string().min(1, 'Circunstancias del despojo requeridas'),
    confrontationAttempts: z.string().min(1, 'Intentos de confrontación requeridos'),

    city: z.string().min(1, 'Ciudad requerida'),
})

type FormValues = z.infer<typeof formSchema>

export function JuicioPlenarioPosesionForm() {
    const [isGenerating, setIsGenerating] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            actorNames: [{ name: '' }],
            defendantName: '',
            actorAddress: '',
            defendantAddress: '',
            authorizedAttorneys: '',
            propertyLotNumber: '',
            propertyBlock: '',
            propertyNeighborhood: '',
            propertyDelegation: '',
            propertyCity: '',
            propertyArea: '',
            propertyBoundaries: {
                north: '',
                south: '',
                east: '',
                west: '',
            },
            acquisitionMethod: '',
            courtName: '',
            caseNumber: '',
            sentenceDate: '',
            possessionStartDate: '',
            purchaseContractDate: '',
            previousOwner: '',
            registryNumber: '',
            registrySection: '',
            registryDate: '',
            relationshipToDefendant: '',
            dispossessionDate: '',
            dispossessionCircumstances: '',
            confrontationAttempts: '',
            city: 'Tijuana, Baja California',
        },
    })

    const { fields: actorFields, append: appendActor, remove: removeActor } = useFieldArray({
        control: form.control,
        name: 'actorNames',
    })

    const watchedValues = form.watch()

    const generateDocument = async (data: FormValues) => {
        setIsGenerating(true)
        try {
            const actorNamesText = data.actorNames.map(a => a.name.toUpperCase()).join(' Y ')

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // CARÁTULA
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: actorNamesText, bold: true }),
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
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "ORDINARIO CIVIL", bold: true }),
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
                                new TextRun({ text: "C. JUEZ DE LO CIVIL EN TURNO.", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Introduction
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: actorNamesText, bold: true }),
                                new TextRun(", mexicanos, mayores de edad, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el ubicado en "),
                                new TextRun({ text: data.actorAddress, bold: true }),
                                data.authorizedAttorneys ? new TextRun(`, y autorizando para tal efecto en los términos del artículo 46 del Código de Procedimientos Civiles a ${data.authorizedAttorneys}`) : new TextRun(""),
                                new TextRun(", ante Usted con el debido respeto comparecemos a exponer:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Demand Statement
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Que por medio del presente ocurso, vengo a demandar en la vía "),
                                new TextRun({ text: "ORDINARIA CIVIL", bold: true }),
                                new TextRun(", ejercitando la "),
                                new TextRun({ text: "ACCIÓN PLENARIA DE POSESIÓN", bold: true }),
                                new TextRun(", en contra de "),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true }),
                                new TextRun(", quien tiene su domicilio en "),
                                new TextRun({ text: data.defendantAddress, bold: true }),
                                new TextRun(", basándome en los siguientes:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PRESTACIONES
                        new Paragraph({
                            children: [
                                new TextRun({ text: "PRESTACIONES:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "A) ", bold: true }),
                                new TextRun("La declaración judicial de que tengo mejor derecho a poseer el inmueble objeto de este juicio."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "B) ", bold: true }),
                                new TextRun("La entrega material y jurídica del inmueble objeto de este juicio."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "C) ", bold: true }),
                                new TextRun("El pago de frutos, accesorios y mejoras que se hubieren realizado al inmueble."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "D) ", bold: true }),
                                new TextRun("El pago de gastos y costas que se generen con motivo del presente juicio."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // HECHOS
                        new Paragraph({
                            children: [
                                new TextRun({ text: "HECHOS:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 1
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "1. ", bold: true }),
                                new TextRun(`Que soy legítima propietaria del inmueble identificado como Lote ${data.propertyLotNumber}, Manzana ${data.propertyBlock}, ubicado en la Colonia ${data.propertyNeighborhood}, Delegación ${data.propertyDelegation}, de esta Ciudad de ${data.propertyCity}, Baja California, con una superficie aproximada de ${data.propertyArea}, con las siguientes medidas y colindancias: AL NORTE: ${data.propertyBoundaries.north}; AL SUR: ${data.propertyBoundaries.south}; AL ESTE: ${data.propertyBoundaries.east}; y AL OESTE: ${data.propertyBoundaries.west}.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 2
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "2. ", bold: true }),
                                new TextRun(`Que adquirí la propiedad del inmueble antes descrito mediante ${data.acquisitionMethod}, promovido ante el ${data.courtName}, bajo el expediente número ${data.caseNumber}, dictándose sentencia en fecha ${data.sentenceDate}.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 3
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "3. ", bold: true }),
                                new TextRun(`Que dicha sentencia fue debidamente inscrita en el Registro Público de la Propiedad y del Comercio bajo el folio número ${data.registryNumber}, Sección ${data.registrySection}, en fecha ${data.registryDate}.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 4
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "4. ", bold: true }),
                                new TextRun(`Que el demandado ${data.defendantName.toUpperCase()} es mi ${data.relationshipToDefendant}, con quien he mantenido una relación familiar.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 5
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "5. ", bold: true }),
                                new TextRun(`Que aproximadamente en fecha ${data.dispossessionDate}, el demandado se apoderó del inmueble de mi propiedad, bajo las siguientes circunstancias: ${data.dispossessionCircumstances}`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 6
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "6. ", bold: true }),
                                new TextRun(`Que he realizado diversos intentos para recuperar la posesión de mi propiedad, específicamente: ${data.confrontationAttempts}`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 7
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "7. ", bold: true }),
                                new TextRun(`Que obtuve el título de propiedad debidamente inscrito en fecha ${data.sentenceDate}, lo cual acredita mi legítimo derecho a poseer el inmueble.`),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 8
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "8. ", bold: true }),
                                new TextRun("Que posteriormente volví a confrontar al demandado, quien persistió en su negativa de desocupar el inmueble."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 9
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "9. ", bold: true }),
                                new TextRun("Que el demandado no cuenta con título legítimo alguno que acredite su derecho a poseer el inmueble objeto del presente juicio."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 10
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "10. ", bold: true }),
                                new TextRun("Que siendo mi voluntad recuperar la posesión del inmueble que legítimamente me pertenece, acudo ante esta autoridad para ejercitar la presente acción plenaria de posesión."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // CAPÍTULO DE DERECHO
                        new Paragraph({
                            children: [
                                new TextRun({ text: "CAPÍTULO DE DERECHO:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Fundo mi acción en los artículos 8, 1143, 2122, 2123, 2140, 2143 y 2144 del Código Civil del Estado de Baja California."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "JURISPRUDENCIA:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: '"POSESION. ACCION PLENARIA DE. REQUISITOS." ', italic: true }),
                                new TextRun("La acción plenaria de posesión requiere que el actor acredite: 1) La posesión del inmueble; 2) Que dicha posesión sea en concepto de propietario; 3) El despojo o perturbación en la posesión; y 4) Que el demandado no tenga mejor derecho a poseer."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PETITIONS
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Por lo expuesto y fundado, a Usted C. Juez, atentamente solicito:", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "PRIMERO. ", bold: true }),
                                new TextRun("Tenerme por presentada con este escrito, demandando en la vía ordinaria civil al ciudadano "),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true }),
                                new TextRun("."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "SEGUNDO. ", bold: true }),
                                new TextRun("Admitir la presente demanda y ordenar el emplazamiento del demandado."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "TERCERO. ", bold: true }),
                                new TextRun("En su momento procesal oportuno, dictar sentencia en la que se declare procedente la acción plenaria de posesión ejercitada."),
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
                                new TextRun(`${data.city}, a ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // Signatures
                        ...data.actorNames.map(actor =>
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun("_________________________________"),
                                ],
                            })
                        ),
                        ...data.actorNames.map(actor =>
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: actor.name.toUpperCase(), bold: true }),
                                ],
                            })
                        ),
                    ]
                }]
            })

            const blob = await Packer.toBlob(doc)
            const fileName = `Juicio_Plenario_Posesion_${data.actorNames[0].name.replace(/\s+/g, '_')}.docx`
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

            const fileName = `Juicio_Plenario_Posesion_${data.actorNames[0].name.replace(/\s+/g, '_')}.pdf`
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
                            <h2 className="text-2xl font-bold mb-2">Juicio Plenario de Posesión</h2>
                            <p className="text-sm text-muted-foreground">
                                Completa los datos para generar la demanda
                            </p>
                        </div>

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información Básica</h3>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Actores</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => appendActor({ name: '' })}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Agregar Actor
                                    </Button>
                                </div>
                                {actorFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <div className="flex-1">
                                            <Input
                                                {...form.register(`actorNames.${index}.name`)}
                                                placeholder="Nombre completo del actor"
                                            />
                                        </div>
                                        {actorFields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeActor(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defendantName">Nombre del Demandado</Label>
                                <Input
                                    id="defendantName"
                                    {...form.register('defendantName')}
                                    placeholder="Ej. Roberto Jaramillo Soriano"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="actorAddress">Domicilio del Actor</Label>
                                <Input
                                    id="actorAddress"
                                    {...form.register('actorAddress')}
                                    placeholder="Ej. Calle Revolución #123, Centro, Tijuana"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defendantAddress">Domicilio del Demandado</Label>
                                <Input
                                    id="defendantAddress"
                                    {...form.register('defendantAddress')}
                                    placeholder="Ej. Calle Constitución #456, Centro, Tijuana"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="authorizedAttorneys">Autorizados (Opcional)</Label>
                                <Input
                                    id="authorizedAttorneys"
                                    {...form.register('authorizedAttorneys')}
                                    placeholder="Ej. Lic. Juan Pérez, Lic. María González"
                                />
                            </div>
                        </div>

                        {/* Property Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Datos del Inmueble</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="propertyLotNumber">Número de Lote</Label>
                                    <Input
                                        id="propertyLotNumber"
                                        {...form.register('propertyLotNumber')}
                                        placeholder="Ej. 15"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="propertyBlock">Manzana</Label>
                                    <Input
                                        id="propertyBlock"
                                        {...form.register('propertyBlock')}
                                        placeholder="Ej. 530"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="propertyNeighborhood">Colonia</Label>
                                <Input
                                    id="propertyNeighborhood"
                                    {...form.register('propertyNeighborhood')}
                                    placeholder="Ej. Guerrero"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="propertyDelegation">Delegación</Label>
                                    <Input
                                        id="propertyDelegation"
                                        {...form.register('propertyDelegation')}
                                        placeholder="Ej. Centro"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="propertyCity">Ciudad del Inmueble</Label>
                                    <Input
                                        id="propertyCity"
                                        {...form.register('propertyCity')}
                                        placeholder="Ej. Tijuana"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="propertyArea">Superficie</Label>
                                <Input
                                    id="propertyArea"
                                    {...form.register('propertyArea')}
                                    placeholder="Ej. 266.26 M²"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Linderos y Colindancias</Label>
                                <div className="space-y-2">
                                    <Input
                                        {...form.register('propertyBoundaries.north')}
                                        placeholder="Norte: Ej. En 16.97 Metros con Lote 4"
                                    />
                                    <Input
                                        {...form.register('propertyBoundaries.south')}
                                        placeholder="Sur: Ej. En 16.97 Metros con Lote 6"
                                    />
                                    <Input
                                        {...form.register('propertyBoundaries.east')}
                                        placeholder="Este: Ej. En 15.69 Metros con Calle Revolución"
                                    />
                                    <Input
                                        {...form.register('propertyBoundaries.west')}
                                        placeholder="Oeste: Ej. En 15.69 Metros con Lote 14"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Acquisition Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información de Adquisición</h3>

                            <div className="space-y-2">
                                <Label htmlFor="acquisitionMethod">Método de Adquisición</Label>
                                <Input
                                    id="acquisitionMethod"
                                    {...form.register('acquisitionMethod')}
                                    placeholder="Ej. juicio ordinario civil de prescripción"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="courtName">Nombre del Juzgado</Label>
                                <Input
                                    id="courtName"
                                    {...form.register('courtName')}
                                    placeholder="Ej. Juzgado Cuarto de lo Civil"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="caseNumber">Número de Expediente</Label>
                                    <Input
                                        id="caseNumber"
                                        {...form.register('caseNumber')}
                                        placeholder="Ej. 1150/2020"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sentenceDate">Fecha de Sentencia</Label>
                                    <Input
                                        id="sentenceDate"
                                        type="date"
                                        {...form.register('sentenceDate')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="possessionStartDate">Fecha de Inicio de Posesión</Label>
                                <Input
                                    id="possessionStartDate"
                                    type="date"
                                    {...form.register('possessionStartDate')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="previousOwner">Propietario Anterior (Opcional)</Label>
                                <Input
                                    id="previousOwner"
                                    {...form.register('previousOwner')}
                                    placeholder="Ej. María del Socorro Carlos"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="purchaseContractDate">Fecha de Contrato de Compra (Opcional)</Label>
                                <Input
                                    id="purchaseContractDate"
                                    type="date"
                                    {...form.register('purchaseContractDate')}
                                />
                            </div>
                        </div>

                        {/* Registry Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información de Registro</h3>

                            <div className="space-y-2">
                                <Label htmlFor="registryNumber">Número de Folio</Label>
                                <Input
                                    id="registryNumber"
                                    {...form.register('registryNumber')}
                                    placeholder="Ej. 6342651"
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
                                        type="date"
                                        {...form.register('registryDate')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dispossession Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Detalles del Despojo</h3>

                            <div className="space-y-2">
                                <Label htmlFor="relationshipToDefendant">Relación con el Demandado</Label>
                                <Input
                                    id="relationshipToDefendant"
                                    {...form.register('relationshipToDefendant')}
                                    placeholder="Ej. sobrino, primo, etc."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dispossessionDate">Fecha Aproximada del Despojo</Label>
                                <Input
                                    id="dispossessionDate"
                                    type="date"
                                    {...form.register('dispossessionDate')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dispossessionCircumstances">Circunstancias del Despojo</Label>
                                <Textarea
                                    id="dispossessionCircumstances"
                                    {...form.register('dispossessionCircumstances')}
                                    placeholder="Describa brevemente cómo ocurrió el despojo del inmueble"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confrontationAttempts">Intentos de Recuperación</Label>
                                <Textarea
                                    id="confrontationAttempts"
                                    {...form.register('confrontationAttempts')}
                                    placeholder="Describa los intentos que ha realizado para recuperar la posesión"
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* City/Location */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Ubicación</h3>

                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input
                                    id="city"
                                    {...form.register('city')}
                                    placeholder="Ej. Tijuana, Baja California"
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
                    <JuicioPlenarioPosesionPreview data={watchedValues} />
                </CardContent>
            </Card>
        </div>
    )
}
