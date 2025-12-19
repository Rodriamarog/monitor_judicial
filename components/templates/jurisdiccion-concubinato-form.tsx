'use client'

import { useState, useEffect } from 'react'
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
import { JurisdiccionConcubinatoPreview } from './jurisdiccion-concubinato-preview'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const formSchema = z.object({
    applicantName: z.string().min(1, 'Nombre del solicitante requerido'),
    applicantAddress: z.string().min(1, 'Domicilio del solicitante requerido'),
    authorizedAttorneys: z.string().optional(),

    // Relationship Details
    deceasedName: z.string().min(1, 'Nombre del finado requerido'),
    relationshipStartMonth: z.string().min(1, 'Mes de inicio requerido'),
    relationshipStartYear: z.string().min(1, 'Año de inicio requerido'),
    sharedAddress: z.string().min(1, 'Domicilio compartido requerido'),

    // Death Details
    deathDate: z.string().min(1, 'Fecha de fallecimiento requerida'),
    deathCity: z.string().min(1, 'Ciudad de fallecimiento requerida'),

    // Children Information
    hasChildren: z.enum(['yes', 'no']),
    childrenNote: z.string().optional(),

    // Relationship Duration
    relationshipYears: z.string().min(1, 'Duración de la relación requerida'),

    // Witnesses
    witnesses: z.array(z.object({
        name: z.string().min(1, 'Nombre del testigo requerido'),
    })).min(2, 'Se requieren al menos dos testigos'),

    city: z.string().min(1, 'Ciudad requerida'),
})

type FormValues = z.infer<typeof formSchema>

export function JurisdiccionConcubinatoForm() {
    const [isGenerating, setIsGenerating] = useState(false)
    const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
    const [checkingGoogle, setCheckingGoogle] = useState(true)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            applicantName: '',
            applicantAddress: '',
            authorizedAttorneys: '',
            deceasedName: '',
            relationshipStartMonth: '',
            relationshipStartYear: '',
            sharedAddress: '',
            deathDate: '',
            deathCity: '',
            hasChildren: 'no',
            childrenNote: '',
            relationshipYears: '',
            witnesses: [{ name: '' }, { name: '' }],
            city: 'Tijuana, B.C.',
        },
    })

    const { fields: witnessFields, append: appendWitness, remove: removeWitness } = useFieldArray({
        control: form.control,
        name: 'witnesses',
    })

    const watchedValues = form.watch()

    // Check Google connection status on mount
    useEffect(() => {
        const checkGoogleStatus = async () => {
            try {
                const response = await fetch('/api/google/status')
                const data = await response.json()
                setGoogleConnected(data.connected && data.scope_valid)
            } catch (error) {
                console.error('Error checking Google status:', error)
                setGoogleConnected(false)
            } finally {
                setCheckingGoogle(false)
            }
        }
        checkGoogleStatus()
    }, [])

    const generateDocument = async (data: FormValues) => {
        setIsGenerating(true)
        try {
            const witnessNames = data.witnesses.map(w => w.name.toUpperCase()).join(' Y ')

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // CARÁTULA
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: data.applicantName.toUpperCase(), bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "JURISDICCION VOLUNTARIA", bold: true }),
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
                                new TextRun({ text: "C. JUEZ DE LO FAMILIAR EN TURNO.", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Introduction
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: data.applicantName.toUpperCase(), bold: true }),
                                new TextRun(", mexicana, mayor de edad, por nuestro propio derecho, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el ubicado en "),
                                new TextRun({ text: data.applicantAddress, bold: true }),
                                data.authorizedAttorneys ? new TextRun(`, y autorizando para tal efecto en los términos del artículo 46 del Código de Procedimientos Civiles vigente en el Estado, a ${data.authorizedAttorneys}`) : new TextRun(""),
                                new TextRun(", ante Usted con el debido respeto comparezco a exponer:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Purpose Statement
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Que por medio del presente escrito y con fundamento en lo dispuesto por los artículos de 878 al 886 y demás relativos del Código de Procedimientos Civiles Vigentes vengo a promover en "),
                                new TextRun({ text: "VIA DE JURISDICCION VOLUNTARIA DILIGENCIAS DE INFORMACIÓN TESTIMONIAL", bold: true }),
                                new TextRun(", con el objeto de acreditar la relación de "),
                                new TextRun({ text: "CONCUBINATO", bold: true }),
                                new TextRun(" que sostuve, la suscrita promovente, "),
                                new TextRun({ text: data.applicantName.toUpperCase(), bold: true }),
                                new TextRun(" con el Sr. "),
                                new TextRun({ text: data.deceasedName.toUpperCase(), bold: true }),
                                new TextRun(" hoy finado, y para tal efecto me permito ofrecer la prueba testimonial a cargo de dos personas, mexicanas, mayores de edad y aptas para testificar y a quienes me comprometo a presentar ante este H. Juzgado en días y horas hábiles que se señalen para su recepción, con el fin de que contesten el interrogatorio directo que se les formulará, por conducto de mi Abogado Procurador."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // HECHOS Header
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Fundamos la presente instancia en la siguiente relación de HECHOS y consideraciones de DERECHO:"),
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
                                new TextRun("La suscrita promovente, "),
                                new TextRun({ text: data.applicantName.toUpperCase(), bold: true }),
                                new TextRun(" manifiesto bajo protesta de decir verdad que en el mes de "),
                                new TextRun({ text: data.relationshipStartMonth, bold: true }),
                                new TextRun(" del año de "),
                                new TextRun({ text: data.relationshipStartYear, bold: true }),
                                new TextRun(", conocí al Sr. "),
                                new TextRun({ text: data.deceasedName.toUpperCase(), bold: true }),
                                new TextRun(", habiendo desarrollado una muy buena empatía, por lo que a finales de ese mismo año iniciamos una relación personal íntima de concubinato, ya que procedimos a establecer al efecto nuestro domicilio común en "),
                                new TextRun({ text: data.sharedAddress, bold: true }),
                                new TextRun("."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 2
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "2.- ", bold: true }),
                                new TextRun("En base a dicha relación de concubinato, ambas partes, es decir la suscrita promovente y el Sr. "),
                                new TextRun({ text: data.deceasedName.toUpperCase(), bold: true }),
                                new TextRun(" adquirimos los derechos y las obligaciones propias como si estuviéramos unidos en matrimonio, toda vez que incluso desde el origen de nuestra relación ambos contribuimos al sostenimiento del hogar."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 3 - Death
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "3.- ", bold: true }),
                                new TextRun("Es el caso, que mi concubino el Sr. "),
                                new TextRun({ text: data.deceasedName.toUpperCase(), bold: true }),
                                new TextRun(" desafortunadamente con fecha "),
                                new TextRun({ text: data.deathDate, bold: true }),
                                new TextRun(" falleció en "),
                                new TextRun({ text: data.deathCity, bold: true }),
                                new TextRun(", tal y como lo acredito con la respectiva certificación de su acta de defunción que me permito exhibir con la presente solicitud."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 4 - Children
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "4.- ", bold: true }),
                                new TextRun(data.hasChildren === 'no'
                                    ? "Es preciso señalar que durante nuestra relación de concubinato no procreamos hijo alguno, desconociendo así mismo si le sobrevive por separado algún hijo en otra relación que hubiese tenido; por lo tanto considero ser la única beneficiaria de la totalidad de sus derechos laborales, de jubilación y demás."
                                    : `Durante nuestra relación de concubinato ${data.childrenNote || 'procreamos hijos'}.`
                                ),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // FACT 5 - Relationship Duration
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "5.- ", bold: true }),
                                new TextRun("Finalmente me permito manifestar que nuestra relación de concubinato la conservamos hasta el último día de la existencia de mi concubino, esto es, hasta la fecha de defunción del Sr. "),
                                new TextRun({ text: data.deceasedName.toUpperCase(), bold: true }),
                                new TextRun(", sucedido, como se ha dicho, desde el mes de "),
                                new TextRun({ text: data.relationshipStartMonth, bold: true }),
                                new TextRun(" de "),
                                new TextRun({ text: data.relationshipStartYear, bold: true }),
                                new TextRun(" hasta, por lo que nuestra relación duró "),
                                new TextRun({ text: data.relationshipYears, bold: true }),
                                new TextRun(" años. Todo lo cual pretendo acreditar con las documentales anexas y la información testimonial que al efecto se ofrece más adelante."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // TESTIMONIAL INFORMATION
                        new Paragraph({
                            children: [
                                new TextRun({ text: "INFORMACIÓN TESTIMONIAL", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("A fin de acreditar los hechos narrados, me permito ofrecer desde ahora la información testimonial que correrá a cargo de los Sres. "),
                                new TextRun({ text: witnessNames, bold: true }),
                                new TextRun(", a quienes me comprometo a presentar ante H. Juzgado el día y hora que señale para el desahogo de dicha probanza."),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // JURISPRUDENCE
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "CONCUBINATO. LAS DILIGENCIAS DE JURISDICCIÓN VOLUNTARIA SON APTAS PARA ACREDITAR ESA RELACIÓN (LEGISLACIÓN DEL ESTADO DE VERACRUZ).", bold: true }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("El artículo 261, fracción VIII, del Código de Procedimientos Civiles para el Estado de Veracruz señala que las actuaciones judiciales de toda especie se consideran documentales públicas. Por su parte, el artículo 326 del mismo ordenamiento señala que las actuaciones judiciales hacen prueba plena; por tanto, hasta en tanto estos documentos no sean declarados nulos, deben surtir todos sus efectos legales."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "SEGUNDO TRIBUNAL COLEGIADO EN MATERIA CIVIL DEL SÉPTIMO CIRCUITO.", bold: true }),
                            ],
                        }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("VII.2o.C.209 C (10a.)"),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // PETITIONS
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun("Por lo expuesto y fundado, a Usted C. Juez atentamente pido se sirva:"),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "PRIMERO.- ", bold: true }),
                                new TextRun("Tenerme por presentada con este escrito promoviendo en Vía de Jurisdicción Voluntaria Diligencias de información Testimonial para acreditar diversos hechos relativos al concubinato."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "SEGUNDO.- ", bold: true }),
                                new TextRun("Admitir la instancia en la Vía y forma propuestas ordenando se dé vista al C. Agente del Ministerio Público Adscrito a este H. Juzgado para los efectos de su representación."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "TERCERO.- ", bold: true }),
                                new TextRun("Mandar recibir la información testimonial que se ofrece."),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "CUARTO.- ", bold: true }),
                                new TextRun("En su oportunidad solicito se me expida copia certificada por duplicado de todo lo actuado en la presente instancia autorizando para que las reciba en mi nombre a los profesionistas ya autorizados con antelación."),
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
                                new TextRun(`${data.city}, a su fecha de presentación.`),
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
                                new TextRun({ text: data.applicantName.toUpperCase(), bold: true }),
                            ],
                        }),
                    ]
                }]
            })

            const blob = await Packer.toBlob(doc)
            const fileName = `Jurisdiccion_Concubinato_${data.applicantName.replace(/\s+/g, '_')}.docx`
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

            const fileName = `Jurisdiccion_Concubinato_${data.applicantName.replace(/\s+/g, '_')}.pdf`
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
                            <h2 className="text-2xl font-bold mb-2">Jurisdicción Voluntaria Concubinato</h2>
                            <p className="text-sm text-muted-foreground">
                                Completa los datos para generar las diligencias
                            </p>
                        </div>

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información del Solicitante</h3>

                            <div className="space-y-2">
                                <Label htmlFor="applicantName">Nombre del Solicitante</Label>
                                <Input
                                    id="applicantName"
                                    {...form.register('applicantName')}
                                    placeholder="Ej. Silvia Muñoz Zavala"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="applicantAddress">Domicilio del Solicitante</Label>
                                <Input
                                    id="applicantAddress"
                                    {...form.register('applicantAddress')}
                                    placeholder="Ej. Avenida Paseo Centenario No. 10310, Zona Río"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="authorizedAttorneys">Abogados Autorizados (Opcional)</Label>
                                <Textarea
                                    id="authorizedAttorneys"
                                    {...form.register('authorizedAttorneys')}
                                    placeholder="Ej. CC. Licenciados Carlos Atilano Peña, Isabel Ines Diaz Hernandez..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Relationship Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Datos de la Relación de Concubinato</h3>

                            <div className="space-y-2">
                                <Label htmlFor="deceasedName">Nombre del Finado</Label>
                                <Input
                                    id="deceasedName"
                                    {...form.register('deceasedName')}
                                    placeholder="Ej. Marco Polo García Cota"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="relationshipStartMonth">Mes de Inicio</Label>
                                    <Input
                                        id="relationshipStartMonth"
                                        {...form.register('relationshipStartMonth')}
                                        placeholder="Ej. Octubre"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="relationshipStartYear">Año de Inicio</Label>
                                    <Input
                                        id="relationshipStartYear"
                                        {...form.register('relationshipStartYear')}
                                        placeholder="Ej. 2004"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sharedAddress">Domicilio Compartido</Label>
                                <Input
                                    id="sharedAddress"
                                    {...form.register('sharedAddress')}
                                    placeholder="Ej. Circuito de los Canelos No. 26017-25B del Fraccionamiento El Refugio"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="relationshipYears">Duración de la Relación (años)</Label>
                                <Input
                                    id="relationshipYears"
                                    {...form.register('relationshipYears')}
                                    placeholder="Ej. 18"
                                />
                            </div>
                        </div>

                        {/* Death Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Datos del Fallecimiento</h3>

                            <div className="space-y-2">
                                <Label htmlFor="deathDate">Fecha de Fallecimiento</Label>
                                <Input
                                    id="deathDate"
                                    {...form.register('deathDate')}
                                    placeholder="Ej. 6 de Febrero del año 2021"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deathCity">Ciudad del Fallecimiento</Label>
                                <Input
                                    id="deathCity"
                                    {...form.register('deathCity')}
                                    placeholder="Ej. Tijuana, Baja California"
                                />
                            </div>
                        </div>

                        {/* Children Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Información sobre Hijos</h3>

                            <div className="space-y-2">
                                <Label>¿Procrearon hijos durante la relación?</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            value="no"
                                            {...form.register('hasChildren')}
                                        />
                                        No
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            value="yes"
                                            {...form.register('hasChildren')}
                                        />
                                        Sí
                                    </label>
                                </div>
                            </div>

                            {watchedValues.hasChildren === 'yes' && (
                                <div className="space-y-2">
                                    <Label htmlFor="childrenNote">Información sobre los Hijos</Label>
                                    <Textarea
                                        id="childrenNote"
                                        {...form.register('childrenNote')}
                                        placeholder="Describa información sobre los hijos..."
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Witnesses */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Testigos</h3>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Lista de Testigos (mínimo 2)</Label>
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
                            {!googleConnected && !checkingGoogle ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <Button
                                        onClick={() => window.location.href = '/dashboard/settings'}
                                        variant="outline"
                                        className="cursor-pointer"
                                    >
                                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#4285F4"/>
                                            <path d="M14 2V8H20" fill="#A1C2FA"/>
                                            <path d="M16 13H8M16 17H8M10 9H8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        Conectar Google en Configuración
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Ve a Configuración para conectar Google y subir documentos
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    onClick={openInGoogleDocs}
                                    variant="outline"
                                    disabled={isGenerating || checkingGoogle || !googleConnected}
                                    className="cursor-pointer"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#4285F4"/>
                                            <path d="M14 2V8H20" fill="#A1C2FA"/>
                                            <path d="M16 13H8M16 17H8M10 9H8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    )}
                                    Abrir en Google Docs
                                </Button>
                            )}
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
            <Card className="flex-1 flex flex-col h-full bg-white dark:bg-white">
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <JurisdiccionConcubinatoPreview data={watchedValues} />
                </CardContent>
            </Card>
        </div>
    )
}
