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
import { OfrecimientoPruebasPreview } from './ofrecimiento-pruebas-preview'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const formSchema = z.object({
    // Case Information
    caseNumber: z.string().min(1, 'Número de expediente requerido'),
    plaintiffNames: z.string().min(1, 'Nombres de actores requeridos'),
    defendantNames: z.string().min(1, 'Nombres de demandados requeridos'),
    caseType: z.string().min(1, 'Tipo de juicio requerido'),
    judgeName: z.string().min(1, 'Nombre del juez requerido'),
    attorneyName: z.string().min(1, 'Nombre del abogado requerido'),

    // Evidence Details
    demandFactsReference: z.string().min(1, 'Referencia a hechos requerida'),

    // Confessional Evidence
    hasConfessional1: z.boolean(),
    confessional1Defendant: z.string().optional(),
    confessional1Type: z.string().optional(),

    hasConfessional2: z.boolean(),
    confessional2Defendant: z.string().optional(),
    confessional2Type: z.string().optional(),

    // Documentary Evidence
    hasDocumentaryPrivate: z.boolean(),
    documentaryPrivateDescription: z.string().optional(),

    hasDocumentaryPublic: z.boolean(),
    documentaryPublicDescription: z.string().optional(),

    // Expert Evidence
    hasExpert: z.boolean(),
    expertName: z.string().optional(),
    expertDescription: z.string().optional(),

    // Testimonial Evidence
    hasTestimonial: z.boolean(),
    witnesses: z.array(z.object({
        name: z.string().min(1, 'Nombre del testigo requerido'),
    })).optional(),

    city: z.string().min(1, 'Ciudad requerida'),
})

type FormValues = z.infer<typeof formSchema>

export function OfrecimientoPruebasForm() {
    const [isGenerating, setIsGenerating] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            caseNumber: '',
            plaintiffNames: '',
            defendantNames: '',
            caseType: 'JUICIO ORDINARIO CIVIL',
            judgeName: '',
            attorneyName: '',
            demandFactsReference: '1, 2, 3, 4 y 5',
            hasConfessional1: false,
            confessional1Defendant: '',
            confessional1Type: 'personalmente',
            hasConfessional2: false,
            confessional2Defendant: '',
            confessional2Type: 'por medio de su representante legal',
            hasDocumentaryPrivate: false,
            documentaryPrivateDescription: '',
            hasDocumentaryPublic: false,
            documentaryPublicDescription: '',
            hasExpert: false,
            expertName: '',
            expertDescription: '',
            hasTestimonial: false,
            witnesses: [{ name: '' }, { name: '' }],
            city: 'Tijuana, B.C.',
        },
    })

    const { fields: witnessFields, append: appendWitness, remove: removeWitness } = useFieldArray({
        control: form.control,
        name: 'witnesses',
    })

    const watchedValues = form.watch()

    const generateDocument = async (data: FormValues) => {
        setIsGenerating(true)
        try {
            const children: Paragraph[] = []
            let evidenceNumber = 1

            // CARÁTULA
            children.push(
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: `EXPEDIENTE.- ${data.caseNumber}`, bold: true }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: data.plaintiffNames.toUpperCase(), bold: true }),
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
                        new TextRun({ text: data.defendantNames.toUpperCase(), bold: true }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: data.caseType.toUpperCase(), bold: true }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),

                // Judge Address
                new Paragraph({
                    children: [
                        new TextRun({ text: data.judgeName.toUpperCase(), bold: true }),
                    ],
                }),
                new Paragraph({ text: "" }),

                // Introduction
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                        new TextRun({ text: data.attorneyName.toUpperCase(), bold: true }),
                        new TextRun(", en mi carácter Abogado Procurador de la Parte Actora, personería que tengo debidamente acreditada en los autos del juicio al rubro indicado, ante Usted con el debido respeto comparezco a exponer:"),
                    ],
                }),
                new Paragraph({ text: "" }),

                // Purpose Statement
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                        new TextRun("Que por medio del presente escrito y con fundamento en lo dispuesto por los artículos del 274 al 418 y demás relativos del Código de Procedimientos Civiles vigente en el Estado, vengo a "),
                        new TextRun({ text: "HACER EL OFRECIMIENTO DE LAS PRUEBAS", bold: true }),
                        new TextRun(" que son a mi cargo de dentro del presente expediente, relacionándolas debidamente con los puntos de hechos de mi demanda, según lo previene el artículo 287 del ordenamiento legal invocado, todo ello particularmente en los siguientes términos:"),
                    ],
                }),
                new Paragraph({ text: "" }),

                // Evidence Header
                new Paragraph({
                    children: [
                        new TextRun({ text: "OFRECIMIENTO DE PRUEBAS:", bold: true }),
                    ],
                }),
                new Paragraph({ text: "" })
            )

            // Evidence 1 - Confessional 1
            if (data.hasConfessional1 && data.confessional1Defendant) {
                children.push(
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                            new TextRun({ text: "LA CONFESIONAL DIRECTA O PROVOCADA", bold: true }),
                            new TextRun(`, a cargo del Sr. ${data.confessional1Defendant.toUpperCase()} quien deberá absolver posiciones ${data.confessional1Type}, y no por medio de apoderado alguno, el día y hora que se señale para el desahogo de dicha probanza, con el apercibimiento de ser declarada confesa si no comparece sin justa causa. Esta prueba la relaciono con los puntos de hechos ${data.demandFactsReference} de mi demanda.`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )
                evidenceNumber++
            }

            // Evidence 2 - Confessional 2
            if (data.hasConfessional2 && data.confessional2Defendant) {
                children.push(
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                            new TextRun({ text: "LA CONFESIONAL DIRECTA O PROVOCADA", bold: true }),
                            new TextRun(`, a cargo del co-demandado ${data.confessional2Defendant.toUpperCase()} quien deberá absolver posiciones ${data.confessional2Type}, el día y hora que se señale para el desahogo de dicha probanza, con el apercibimiento de ser declarada confesa si no comparece sin justa causa. Esta prueba la relaciono con los puntos de hechos ${data.demandFactsReference} de mi demanda.`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )
                evidenceNumber++
            }

            // Evidence - Documentary Private
            if (data.hasDocumentaryPrivate && data.documentaryPrivateDescription) {
                children.push(
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                            new TextRun({ text: "LA DOCUMENTAL PRIVADA", bold: true }),
                            new TextRun(`, consistente en ${data.documentaryPrivateDescription}. Esta prueba la relaciono con los puntos de hechos ${data.demandFactsReference} de mi demanda.`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )
                evidenceNumber++
            }

            // Evidence - Documentary Public
            if (data.hasDocumentaryPublic && data.documentaryPublicDescription) {
                children.push(
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                            new TextRun({ text: "LAS DOCUMENTALES PUBLICAS", bold: true }),
                            new TextRun(`, consistente en ${data.documentaryPublicDescription}. Esta prueba la relaciono con los puntos de hechos ${data.demandFactsReference} de mi demanda.`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )
                evidenceNumber++
            }

            // Evidence - Expert
            if (data.hasExpert && data.expertName && data.expertDescription) {
                children.push(
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                            new TextRun({ text: "LA PERICIAL", bold: true }),
                            new TextRun(`, consistente en dictamen pericial del perito ${data.expertName} ${data.expertDescription}. Esta prueba la relaciono con los puntos de hechos ${data.demandFactsReference} de mi demanda.`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )
                evidenceNumber++
            }

            // Evidence - Testimonial
            if (data.hasTestimonial && data.witnesses && data.witnesses.length > 0) {
                const witnessNames = data.witnesses.filter(w => w.name).map(w => w.name.toUpperCase())

                children.push(
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                            new TextRun({ text: "LA TESTIMONIAL", bold: true }),
                            new TextRun(`, consistente en la declaración de ${data.witnesses.length} testigos los cuales tienen conocimiento de los hechos controvertidos y a quienes me comprometo a presentar ante éste H. Juzgado el día y hora que se señale para el desahogo de dicha probanza, mismos que deberán responder al interrogatorio que se les formulara, el día y hora señalado para que tenga verificativo dicha probanza ellos son:`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )

                witnessNames.forEach(name => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: name, bold: true }),
                            ],
                        })
                    )
                })

                children.push(
                    new Paragraph({ text: "" }),
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [
                            new TextRun(`Esta prueba la relaciono con los puntos de hechos ${data.demandFactsReference} de mi demanda.`),
                        ],
                    }),
                    new Paragraph({ text: "" })
                )
                evidenceNumber++
            }

            // Standard Evidence - Presumptive
            children.push(
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                        new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                        new TextRun({ text: "LA PRESUNCIONAL LEGAL Y HUMANA", bold: true }),
                        new TextRun(", consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie a mis intereses. Esta prueba la relaciono con todos los puntos de hechos de mi demanda y contestación a la reconvención, art. 287 del Código Adjetivo."),
                    ],
                }),
                new Paragraph({ text: "" })
            )
            evidenceNumber++

            // Standard Evidence - Instrumental
            children.push(
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                        new TextRun({ text: `${evidenceNumber}.- `, bold: true }),
                        new TextRun({ text: "LA INSTRUMENTAL PUBLICA DE ACTUACIONES", bold: true }),
                        new TextRun(", consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie mis intereses. Esta prueba la relaciono con todos los puntos de hechos de mi demanda y contestación a la reconvención, art. 287 del Código Adjetivo."),
                    ],
                }),
                new Paragraph({ text: "" })
            )

            // Petition
            children.push(
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                        new TextRun("Por lo expuesto y fundado, a Usted C. JUEZ atentamente pedimos se sirva:"),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                        new TextRun({ text: "UNICO.- ", bold: true }),
                        new TextRun("Tenerme por presentado con este escrito y documentos anexos, haciendo en tiempo y forma, el ofrecimiento de las pruebas, mismas que se encuentran debidamente relacionadas en los términos de Ley y que solicito que en su oportunidad sean admitidas en su totalidad por estar ajustadas a derecho y no atentar contra la moral ni las buenas costumbres."),
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
                        new TextRun(`${data.city}, al día de su presentación.`),
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
                        new TextRun({ text: data.attorneyName.toUpperCase(), bold: true }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun("ABOGADO PROCURADOR"),
                    ],
                })
            )

            const doc = new Document({
                sections: [{
                    properties: {},
                    children
                }]
            })

            const blob = await Packer.toBlob(doc)
            const fileName = `Ofrecimiento_Pruebas_${data.caseNumber.replace(/\//g, '-')}.docx`
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

            const fileName = `Ofrecimiento_Pruebas_${data.caseNumber.replace(/\//g, '-')}.pdf`
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
                            <h2 className="text-2xl font-bold mb-2">Ofrecimiento de Pruebas</h2>
                            <p className="text-sm text-muted-foreground">
                                Completa los datos para generar el ofrecimiento
                            </p>
                        </div>

                        {/* Case Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información del Caso</h3>

                            <div className="space-y-2">
                                <Label htmlFor="caseNumber">Número de Expediente</Label>
                                <Input
                                    id="caseNumber"
                                    {...form.register('caseNumber')}
                                    placeholder="Ej. 731/2025"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="plaintiffNames">Nombres de Actores</Label>
                                <Input
                                    id="plaintiffNames"
                                    {...form.register('plaintiffNames')}
                                    placeholder="Ej. Daniel Carrazco Soria y Raymundo Carrasco Soria"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defendantNames">Nombres de Demandados</Label>
                                <Input
                                    id="defendantNames"
                                    {...form.register('defendantNames')}
                                    placeholder="Ej. Juan Manuel Negrete Galvan y Suc. Bienes de Antonio Negrete Duarte"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="caseType">Tipo de Juicio</Label>
                                <Input
                                    id="caseType"
                                    {...form.register('caseType')}
                                    placeholder="Ej. JUICIO ORDINARIO CIVIL"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="judgeName">Nombre del Juez</Label>
                                <Input
                                    id="judgeName"
                                    {...form.register('judgeName')}
                                    placeholder="Ej. C. JUEZ DECIMO OCTAVO DE LO CIVIL"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="attorneyName">Nombre del Abogado Procurador</Label>
                                <Input
                                    id="attorneyName"
                                    {...form.register('attorneyName')}
                                    placeholder="Ej. LIC. CARLOS ATILANO PEÑA"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="demandFactsReference">Referencia a Hechos de la Demanda</Label>
                                <Input
                                    id="demandFactsReference"
                                    {...form.register('demandFactsReference')}
                                    placeholder="Ej. 1, 2, 3, 4 y 5"
                                />
                            </div>
                        </div>

                        {/* Confessional Evidence */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Prueba Confesional</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        {...form.register('hasConfessional1')}
                                    />
                                    <span>Incluir primera prueba confesional</span>
                                </label>

                                {watchedValues.hasConfessional1 && (
                                    <>
                                        <Input
                                            {...form.register('confessional1Defendant')}
                                            placeholder="Nombre del demandado"
                                        />
                                        <Input
                                            {...form.register('confessional1Type')}
                                            placeholder="Tipo: personalmente / por medio de representante"
                                        />
                                    </>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        {...form.register('hasConfessional2')}
                                    />
                                    <span>Incluir segunda prueba confesional</span>
                                </label>

                                {watchedValues.hasConfessional2 && (
                                    <>
                                        <Input
                                            {...form.register('confessional2Defendant')}
                                            placeholder="Nombre del co-demandado"
                                        />
                                        <Input
                                            {...form.register('confessional2Type')}
                                            placeholder="Tipo: personalmente / por medio de representante"
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Documentary Evidence */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Prueba Documental</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        {...form.register('hasDocumentaryPrivate')}
                                    />
                                    <span>Incluir documental privada</span>
                                </label>

                                {watchedValues.hasDocumentaryPrivate && (
                                    <Textarea
                                        {...form.register('documentaryPrivateDescription')}
                                        placeholder="Descripción de la documental privada (ej. original del contrato de compraventa...)"
                                        rows={3}
                                    />
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        {...form.register('hasDocumentaryPublic')}
                                    />
                                    <span>Incluir documentales públicas</span>
                                </label>

                                {watchedValues.hasDocumentaryPublic && (
                                    <Textarea
                                        {...form.register('documentaryPublicDescription')}
                                        placeholder="Descripción de las documentales públicas (ej. levantamiento topográfico, certificado del RPP...)"
                                        rows={3}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Expert Evidence */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Prueba Pericial</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        {...form.register('hasExpert')}
                                    />
                                    <span>Incluir prueba pericial</span>
                                </label>

                                {watchedValues.hasExpert && (
                                    <>
                                        <Input
                                            {...form.register('expertName')}
                                            placeholder="Nombre del perito (ej. Ing. Rafael Frayre González)"
                                        />
                                        <Textarea
                                            {...form.register('expertDescription')}
                                            placeholder="Descripción del dictamen pericial"
                                            rows={3}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Testimonial Evidence */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Prueba Testimonial</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        {...form.register('hasTestimonial')}
                                    />
                                    <span>Incluir prueba testimonial</span>
                                </label>

                                {watchedValues.hasTestimonial && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <Label>Testigos</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => appendWitness({ name: '' })}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Agregar Testigo
                                            </Button>
                                        </div>
                                        {witnessFields.map((field, index) => (
                                            <div key={field.id} className="flex gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        {...form.register(`witnesses.${index}.name`)}
                                                        placeholder={`Testigo ${index + 1}`}
                                                    />
                                                </div>
                                                {witnessFields.length > 2 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeWitness(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}
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
                    <OfrecimientoPruebasPreview data={watchedValues} />
                </CardContent>
            </Card>
        </div>
    )
}
