
'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Download, Loader2, FileText, FileDown, ExternalLink } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { LivePreview } from './live-preview'

const formSchema = z.object({
    actorName: z.string().min(1, 'Nombre del actor requerido'),
    defendantName: z.string().min(1, 'Nombre del demandado requerido'),
    actorAddress: z.string().min(1, 'Domicilio del actor requerido'),
    defendantAddress: z.string().min(1, 'Domicilio del demandado requerido'),
    authorizedPersons: z.string().optional(),
    children: z.array(z.object({
        name: z.string().min(1, 'Nombre requerido'),
        dob: z.string().min(1, 'Fecha de nacimiento requerida'),
    })).min(1, 'Al menos un hijo es requerido'),
    relationshipStartDate: z.string().min(1, 'Fecha de inicio de relación requerida'),
    previousAmount: z.string().min(1, 'Monto anterior requerido'),
    stopDate: z.string().min(1, 'Fecha de suspensión requerida'),
    witnesses: z.array(z.object({
        name: z.string().min(1, 'Nombre requerido'),
    })).min(2, 'Al menos dos testigos son requeridos'),
    city: z.string().min(1, 'Ciudad requerida'),
})

type FormValues = z.infer<typeof formSchema>

export function JuicioAlimentosForm() {
    const [isGenerating, setIsGenerating] = useState(false)
    const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
    const [checkingGoogle, setCheckingGoogle] = useState(true)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            actorName: '',
            defendantName: '',
            actorAddress: '',
            defendantAddress: '',
            authorizedPersons: '',
            children: [{ name: '', dob: '' }],
            relationshipStartDate: '',
            previousAmount: '',
            stopDate: '',
            witnesses: [{ name: '' }, { name: '' }],
            city: 'Tijuana, Baja California',
        },
    })

    const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
        control: form.control,
        name: 'children',
    })

    const { fields: witnessFields, append: appendWitness, remove: removeWitness } = useFieldArray({
        control: form.control,
        name: 'witnesses',
    })

    // Watch all fields for live preview
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


    // Helper function to create the document structure
    const createDocumentStructure = (data: FormValues) => {
        return new Document({
                sections: [{
                    properties: {},
                    children: [
                        // CARÁTULA (Header with parties and case type)
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: data.actorName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "VS.", bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "JUICIO SUMARIO DE ALIMENTOS", bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "I N I C I O", bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // Judge Address
                        new Paragraph({
                            children: [
                                new TextRun({ text: "C. JUEZ DE PRIMERA INSTANCIA", bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "DE LO FAMILIAR EN TURNO.", bold: true, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Intro
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: data.actorName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ", mexicana, mayor de edad y en mi carácter de madre ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "de la menor ", size: 24, font: "Times New Roman" }) : new TextRun({ text: "de los menores ", size: 24, font: "Times New Roman" }),
                                ...data.children.map((child, index) =>
                                    new TextRun({
                                        text: `${child.name.toUpperCase()}${index < data.children.length - 1 ? ", " : ""} `,
                                        bold: true,
                                        size: 24,
                                        font: "Times New Roman"
                                    })
                                ),
                                new TextRun({ text: ` y en ejercicio de la patria potestad ${data.children.length === 1 ? 'de dicha menor' : 'de dichos menores'}, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el ubicado en `, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.actorAddress, bold: true, size: 24, font: "Times New Roman" }),
                                data.authorizedPersons ? new TextRun({ text: `, y autorizando para tal efecto en los términos del artículo 46 del Código de Procedimientos Civiles a ${data.authorizedPersons}`, size: 24, font: "Times New Roman" }) : new TextRun({ text: "", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ", ante Usted con el debido respeto comparezco a exponer:", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // Demand
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "Que por medio del presente escrito en la Vía Sumaria Civil y en ejercicio de la Acción de Alimentos, vengo a demandar al Sr. ", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ", quien tiene su domicilio particular en ", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantAddress, bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ", por las siguientes:", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: "P R E S T A C I O N E S :", bold: true, size: 24, font: "Times New Roman" })],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "A).- Por el pago y el aseguramiento de una pensión alimenticia provisional, la cual deberá ser fijada de inmediato a criterio de su Señoría, a fin de satisfacer las necesidades alimenticias de la suscrita promovente y ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "de mi menor hija ", size: 24, font: "Times New Roman" }) : new TextRun({ text: "de mis menores hijos ", size: 24, font: "Times New Roman" }),
                                ...data.children.map((child, index) =>
                                    new TextRun({
                                        text: `${child.name.toUpperCase()}${index < data.children.length - 1 ? ", " : ""} `,
                                        bold: true,
                                        size: 24,
                                        font: "Times New Roman"
                                    })
                                ),
                                new TextRun({ text: ".", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "B).- Por el pago y el aseguramiento de una pensión alimenticia definitiva, que sea justa, suficiente y bastante a criterio de su Señoría para satisfacer las necesidades de la suscrita promovente y ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "de mi menor hija ", size: 24, font: "Times New Roman" }) : new TextRun({ text: "de mis menores hijos ", size: 24, font: "Times New Roman" }),
                                ...data.children.map((child, index) =>
                                    new TextRun({
                                        text: `${child.name.toUpperCase()}${index < data.children.length - 1 ? ", " : ""} `,
                                        bold: true,
                                        size: 24,
                                        font: "Times New Roman"
                                    })
                                ),
                                new TextRun({ text: ".", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "C).- Por el pago de los gastos y las costas que se originen en el presente juicio.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "Fundo la presente demanda en la siguiente relación de hechos y consideraciones de derecho:", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: "H E C H O S :", bold: true, size: 24, font: "Times New Roman" })],
                        }),
                        new Paragraph({ text: "" }),

                        // Facts
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: `1.- Hace aproximadamente ${data.relationshipStartDate} que la suscrita promovente y el ahora demandado Sr. `, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: " nos conocimos e iniciamos una relación de noviazgo, haciendo expresamente la aclaración de que desde un principio vivimos habiendo mantenido y sostenido de manera periódica, es decir más o menos constante y reiterada, relaciones sexuales y desde luego una serie de convivencias como pareja.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "2.- Como consecuencia de la relación de noviazgo ya señalada, ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "con fecha ", size: 24, font: "Times New Roman" }) : new TextRun({ text: "ocurrieron los nacimientos de ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: `${data.children[0].dob} ocurrió el nacimiento de nuestra hija menor con nombre `, size: 24, font: "Times New Roman" }) : new TextRun({ text: "nuestros hijos menores con nombres ", size: 24, font: "Times New Roman" }),
                                ...data.children.map((child, index) =>
                                    new TextRun({
                                        text: `${child.name.toUpperCase()}${data.children.length > 1 ? ` (nacido el ${child.dob})` : ''}${index < data.children.length - 1 ? ", " : ""} `,
                                        bold: true
                                    })
                                ),
                                new TextRun({ text: ", tal y como se acredita con la exhibición que me permito realizar de ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "la respectiva acta de nacimiento debidamente certificada, reconocida", size: 24, font: "Times New Roman" }) : new TextRun({ text: "las respectivas actas de nacimiento debidamente certificadas, reconocidas", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: " por la parte demandada Sr. ", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ".", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: `3.- He de mencionar que si bien es cierto el demandado Sr. ${data.defendantName.toUpperCase()} no ha dejado a la suscrita y a ${data.children.length === 1 ? 'nuestra menor hija' : 'nuestros menores hijos'} en completo estado de abandono, también lo es que sus aportaciones no han sido bastantes y suficientes ni con la periodicidad adecuadas para el debido sostenimiento de nuestro hogar y sobre todo por lo que a la pensión alimenticia se refiere; por lo que la situación para la suscrita y ${data.children.length === 1 ? 'nuestra menor hija' : 'nuestros menores hijos'} ha sido muy difícil y complicada.`, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: `4.- En efecto, en un principio el ahora demandado única y exclusivamente me entregaba la cantidad de ${data.previousAmount} Pesos Moneda Nacional mensuales, y en últimas fechas mantiene periodos de hasta dos meses o más de tiempo sin que me haga aportación alguna, lo que impide que la suscrita pueda proveer lo suficiente al mantenimiento del hogar que contengo constituido con ${data.children.length === 1 ? 'nuestra menor hija' : 'nuestros menores hijos'} y sobre todo por cuanto hace a todo lo que incluye el concepto alimentos, ya que me es muy difícil cubrir comidas, vestido, escuelas, medicinas, renta, transportación, esparcimiento y otros aspectos con las pocas aportaciones del demandado y con lo que la suscrita gano por mi trabajo.`, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: `5.- Es el caso, que desde ${data.stopDate} el ahora demandado Sr. `, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ` ha procedido a suspender todo tipo de ayuda, sobre todo la económica, tanto de la suscrita como de ${data.children.length === 1 ? 'nuestra menor hija' : 'nuestros menores hijos'}, dejando de aportar cantidad alguna para los alimentos.`, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "6.- En virtud de lo narrado con anterioridad y tomando en consideración que desde la fecha indicada el demandado se ha abstenido de proporcionar cantidad alguna para nuestro sostenimiento, es por lo que me veo en la imperiosa necesidad de plantearle la presente demanda solicitando a su Señoría se fije a la brevedad posible la pensión alimenticia que en derecho proceda.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // OFRECIMIENTO DE PRUEBAS
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: "OFRECIMIENTO DE PRUEBAS", bold: true, size: 24, font: "Times New Roman" })],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "En este apartado ofrezco como pruebas de mi parte, mismas que relaciono con todos y cada uno de los puntos de hechos de mi demanda, en los términos del artículo 287 del Código de Procedimientos Civiles vigente, las siguientes:", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "1.- LA CONFESIONAL DIRECTA O PROVOCADA a cargo de la parte demandada, el Sr. ", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ", quien deberá absolver personalmente y no por medio de apoderado legal alguno el pliego de posiciones que en sobre cerrado se acompaña, el día y hora que se señale para tal efecto, apercibido de ser declarado confeso si no comparece sin justa causa en los términos de Ley. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "2.- LA TESTIMONIAL consistente en la declaración de ", size: 24, font: "Times New Roman" }),
                                data.witnesses.length === 1 ? new TextRun({ text: "un testigo", size: 24, font: "Times New Roman" }) : new TextRun({ text: `${data.witnesses.length} testigos`, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: " a quienes les constan los hechos materia de la presente demanda y a quienes me comprometo a presentar ante este H. Juzgado el día y hora que se señale para el desahogo de dicha probanza, ", size: 24, font: "Times New Roman" }),
                                data.witnesses.length === 1 ? new TextRun({ text: "es: ", size: 24, font: "Times New Roman" }) : new TextRun({ text: "ellos son:", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        ...data.witnesses.map((w, index) =>
                            new Paragraph({
                                alignment: AlignmentType.JUSTIFIED,
                                children: [
                                    new TextRun({ text: `        ${String.fromCharCode(97 + index)}).- ${w.name.toUpperCase()}`, size: 24, font: "Times New Roman" }),
                                ],
                            })
                        ),

                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "3.- LA DOCUMENTAL PUBLICA consistente en ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "la acta de nacimiento de mi menor hija ", size: 24, font: "Times New Roman" }) : new TextRun({ text: "las actas de nacimiento de mis menores hijos ", size: 24, font: "Times New Roman" }),
                                ...data.children.map((child, index) =>
                                    new TextRun({
                                        text: `${child.name.toUpperCase()}${index < data.children.length - 1 ? ", " : ""} `,
                                        bold: true,
                                        size: 24,
                                        font: "Times New Roman"
                                    })
                                ),
                                new TextRun({ text: "que se acompañan con la presente demanda. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "4.- PRESUNCIONAL LEGAL Y HUMANA consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie a mis intereses. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "5.- LA INSTRUMENTAL PUBLICA DE ACTUACIONES consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie a mis intereses. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // CAPITULO ESPECIAL
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: "CAPITULO ESPECIAL", bold: true, size: 24, font: "Times New Roman" })],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "En este apartado y con fundamento en lo dispuesto por los artículos 312 Fracciones I y II, 314 y demás relativos del Código Civil en vigor, en relación con los artículos 214, 925, 926, 927, 929, 930 y demás relativos del Código de Procedimientos Civiles vigente en el Estado, solicito se fije de inmediato y a manera de medida provisional una pensión alimenticia que sea bastante y suficiente a cubrir las necesidades que por ese concepto tenemos tanto la suscrita como ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "mi menor hija", size: 24, font: "Times New Roman" }) : new TextRun({ text: "mis menores hijos", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ".", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        // CAPITULO DE DERECHO
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: "CAPITULO DE DERECHO", bold: true, size: 24, font: "Times New Roman" })],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "Son aplicables en cuanto al fondo del presente asunto lo dispuesto por los artículos 298, 299, 300, 305, 306, 308, 312, 313, 314, 318, 320 y demás relativos del Código Civil en vigor.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "En cuanto al Procedimiento lo rige lo establecido por los artículos del 424 al 435 del Código De Procedimientos Civiles vigente en el Estado.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "Por lo anteriormente expuesto y fundado a Usted C. Juez de lo Civil en turno atentamente pido se sirva:", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "PRIMERO.- Tenerme por presentada con este escrito y documentos anexos demandando al Sr. ", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: data.defendantName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                                new TextRun({ text: " por las prestaciones que se reclaman.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "SEGUNDO.- Admitir la demanda en la vía y forma propuesta ordenando el emplazamiento de la parte demandada en los términos de ley.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "TERCERO.- Por ofrecidas las pruebas que se indican, mismas que pido se manden desahogar en la audiencia respectiva.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "CUARTO.- Dictar proveído en el que se fije la pensión alimenticia provisional y en su oportunidad la definitiva que sea bastante y suficiente para garantizar las necesidades alimenticias de la suscrita actora y ", size: 24, font: "Times New Roman" }),
                                data.children.length === 1 ? new TextRun({ text: "nuestra menor hija", size: 24, font: "Times New Roman" }) : new TextRun({ text: "nuestros menores hijos", size: 24, font: "Times New Roman" }),
                                new TextRun({ text: ", ordenando su aseguramiento en los términos solicitados.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            children: [
                                new TextRun({ text: "QUINTO.- En su oportunidad dictar Sentencia Definitiva en la que se condene al demandado al pago de las prestaciones reclamadas.", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // Footer
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "PROTESTO LO NECESARIO", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: `${data.city}, al día de su presentación.`, size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "_____________________________", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: data.actorName.toUpperCase(), size: 24, font: "Times New Roman" }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "ABOGADO PROCURADOR", size: 24, font: "Times New Roman" }),
                            ],
                        }),
                    ],
                }],
            })
    }

    const generateDocument = async (data: FormValues) => {
        setIsGenerating(true)
        try {
            const doc = createDocumentStructure(data)
            const blob = await Packer.toBlob(doc)
            saveAs(blob, `Demanda_Alimentos_${data.actorName.replace(/\s+/g, '_')}.docx`)
            toast.success('Documento DOCX generado correctamente')
        } catch (error) {
            console.error(error)
            toast.error('Error al generar el documento')
        } finally {
            setIsGenerating(false)
        }
    }

    const generatePDF = async () => {
        try {
            // Add print styles to the page
            const styleSheet = document.createElement('style')
            styleSheet.id = 'print-styles'
            styleSheet.textContent = `
                @media print {
                    /* Hide everything except print content */
                    body * {
                        visibility: hidden;
                    }

                    /* Show only the preview content */
                    .live-preview-content,
                    .live-preview-content * {
                        visibility: visible;
                    }

                    /* Position content properly */
                    .live-preview-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                    }

                    /* Ensure proper text rendering */
                    * {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }

                @page {
                    size: letter;
                    margin: 25.4mm;
                }
            `
            document.head.appendChild(styleSheet)

            // Trigger print
            window.print()

            // Remove styles after print
            setTimeout(() => {
                const styles = document.getElementById('print-styles')
                if (styles) {
                    document.head.removeChild(styles)
                }
            }, 100)

            toast.success('Documento listo para guardar como PDF')
        } catch (error) {
            console.error(error)
            toast.error('Error al generar el PDF')
        }
    }

    const autoFillForm = () => {
        form.setValue('actorName', 'María Guadalupe Pérez López')
        form.setValue('defendantName', 'Juan Carlos González Ramírez')
        form.setValue('actorAddress', 'Calle Revolución #123, Col. Centro, Tijuana, B.C.')
        form.setValue('defendantAddress', 'Av. Constitución #456, Col. Zona Río, Tijuana, B.C.')
        form.setValue('authorizedPersons', 'Lic. Roberto Martínez García')
        form.setValue('children', [
            { name: 'Ana Sofía González Pérez', dob: '2018-05-15' },
            { name: 'Carlos Emilio González Pérez', dob: '2020-08-22' }
        ])
        form.setValue('relationshipStartDate', '5 años')
        form.setValue('previousAmount', '$3,000.00')
        form.setValue('stopDate', 'marzo de 2024')
        form.setValue('witnesses', [
            { name: 'Claudia Fernández Torres' },
            { name: 'Pedro Sánchez Morales' }
        ])
        form.setValue('city', 'Tijuana, Baja California')
        toast.success('Formulario auto-completado')
    }

    const openInGoogleDocs = async () => {
        setIsGenerating(true)

        // Open blank window immediately to avoid popup blocking
        const newWindow = window.open('about:blank', '_blank')

        try {
            const data = watchedValues

            // Validate form data
            const result = formSchema.safeParse(data)
            if (!result.success) {
                toast.error('Por favor completa todos los campos requeridos')
                setIsGenerating(false)
                newWindow?.close()
                return
            }

            // User is connected - proceed with upload
            const doc = createDocumentStructure(data)
            const blob = await Packer.toBlob(doc)

            // Create FormData for API upload
            const formData = new FormData()
            const fileName = `Demanda_Alimentos_${data.actorName.replace(/\s+/g, '_')}.docx`
            const file = new File([blob], fileName, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            })
            formData.append('file', file)
            formData.append('fileName', fileName)

            // Upload to Google Docs via API
            const response = await fetch('/api/google-docs/upload', {
                method: 'POST',
                body: formData,
            })

            const responseData = await response.json()

            if (!response.ok) {
                toast.error(responseData.error || 'Error al subir a Google Docs')
                newWindow?.close()
                return
            }

            // Navigate the opened window to Google Docs
            if (responseData.docsUrl && newWindow) {
                newWindow.location.href = responseData.docsUrl
                toast.success('Documento abierto en Google Docs')
            } else {
                toast.error('No se pudo obtener la URL del documento')
                newWindow?.close()
            }

        } catch (error) {
            console.error('Error opening in Google Docs:', error)
            toast.error('Error al abrir en Google Docs')
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
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Juicio de Alimentos</h2>
                                <p className="text-sm text-muted-foreground">
                                    Completa los datos para generar la demanda
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={autoFillForm}
                            >
                                🧪 Auto-rellenar (Dev)
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Nombre del Actor (Tú)</Label>
                            <Input {...form.register('actorName')} placeholder="Ej. María Pérez López" />
                            {form.formState.errors.actorName && (
                                <p className="text-sm text-red-500">{form.formState.errors.actorName.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre del Demandado</Label>
                            <Input {...form.register('defendantName')} placeholder="Ej. Juan González" />
                            {form.formState.errors.defendantName && (
                                <p className="text-sm text-red-500">{form.formState.errors.defendantName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Domicilio del Actor</Label>
                            <Input {...form.register('actorAddress')} placeholder="Ej. Ave. Paseo Centenario No. 10310..." />
                            {form.formState.errors.actorAddress && (
                                <p className="text-sm text-red-500">{form.formState.errors.actorAddress.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Domicilio del Demandado</Label>
                            <Input {...form.register('defendantAddress')} placeholder="Ej. Avenida Valle del Sur No. 10524..." />
                            {form.formState.errors.defendantAddress && (
                                <p className="text-sm text-red-500">{form.formState.errors.defendantAddress.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Personas Autorizadas (Opcional)</Label>
                        <Input {...form.register('authorizedPersons')} placeholder="Ej. CC. Lics. Juan Pérez, María García..." />
                        <p className="text-xs text-muted-foreground">Abogados o personas autorizadas para recibir notificaciones</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Hijos</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendChild({ name: '', dob: '' })}>
                                <Plus className="h-4 w-4 mr-2" /> Agregar Hijo
                            </Button>
                        </div>
                        {childFields.map((field, index) => (
                            <Card key={field.id}>
                                <CardContent className="pt-6">
                                    <div className="flex gap-4 items-end">
                                        <div className="flex-1 space-y-2">
                                            <Label>Nombre Completo</Label>
                                            <Input {...form.register(`children.${index}.name`)} placeholder="Nombre del menor" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label>Fecha de Nacimiento</Label>
                                            <Input {...form.register(`children.${index}.dob`)} type="date" />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeChild(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {form.formState.errors.children && (
                            <p className="text-sm text-red-500">{form.formState.errors.children.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>¿Hace cuánto tiempo iniciaron la relación?</Label>
                        <Input {...form.register('relationshipStartDate')} placeholder="Ej. 7 años" />
                        {form.formState.errors.relationshipStartDate && (
                            <p className="text-sm text-red-500">{form.formState.errors.relationshipStartDate.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Tiempo aproximado desde que iniciaron la relación</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Monto Anterior ($)</Label>
                            <Input {...form.register('previousAmount')} placeholder="Ej. $500.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de Suspensión</Label>
                            <Input {...form.register('stopDate')} placeholder="Ej. Enero del presente año" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Testigos (Mínimo 2)</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendWitness({ name: '' })}>
                                <Plus className="h-4 w-4 mr-2" /> Agregar Testigo
                            </Button>
                        </div>
                        {witnessFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Nombre del Testigo {index + 1}</Label>
                                    <Input {...form.register(`witnesses.${index}.name`)} placeholder="Nombre completo" />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeWitness(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {form.formState.errors.witnesses && (
                            <p className="text-sm text-red-500">{form.formState.errors.witnesses.message}</p>
                        )}
                    </div>

                        <div className="space-y-2">
                            <Label>Ciudad y Estado</Label>
                            <Input {...form.register('city')} placeholder="Ej. Tijuana, Baja California" />
                        </div>

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
                    <LivePreview data={watchedValues as FormValues} />
                </CardContent>
            </Card>
        </div>
    )
}

