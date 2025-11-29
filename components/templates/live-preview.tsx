import { Card } from "@/components/ui/card"

interface LivePreviewProps {
    data: {
        actorName: string
        defendantName: string
        actorAddress: string
        defendantAddress: string
        authorizedPersons?: string
        children: { name: string; dob: string }[]
        relationshipStartDate: string
        previousAmount: string
        stopDate: string
        witnesses: { name: string }[]
        city: string
    }
}

export function LivePreview({ data }: LivePreviewProps) {
    return (
        <Card className="bg-white text-black font-serif p-8 shadow-lg min-h-[800px] max-w-[21cm] mx-auto border-none">
            <div className="space-y-4 text-sm leading-relaxed live-preview-content">
                {/* CARÁTULA */}
                <div className="text-right font-bold space-y-2">
                    <p className="uppercase">{data.actorName || "[NOMBRE DEL ACTOR]"}</p>
                    <p>VS.</p>
                    <p className="uppercase">{data.defendantName || "[NOMBRE DEL DEMANDADO]"}</p>
                    <p className="mt-4">JUICIO SUMARIO DE ALIMENTOS</p>
                    <p className="mt-2">I N I C I O</p>
                </div>

                {/* Judge Address */}
                <div className="font-bold mt-6">
                    <p>C. JUEZ DE PRIMERA INSTANCIA</p>
                    <p>DE LO FAMILIAR EN TURNO.</p>
                </div>

                {/* Intro */}
                <div className="text-justify mt-4">
                    <p>
                        <span className="font-bold uppercase">{data.actorName || "[NOMBRE DEL ACTOR]"}</span>, mexicana, mayor de edad y en mi carácter de madre {data.children.length === 1 ? "de la menor" : "de los menores"}{" "}
                        {data.children.map((child, index) => (
                            <span key={index} className="font-bold uppercase">
                                {child.name || "[NOMBRE]"}
                                {index < data.children.length - 1 ? ", " : ""}
                            </span>
                        ))}{" "}
                        y en ejercicio de la patria potestad {data.children.length === 1 ? "de dicha menor" : "de dichos menores"}, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el ubicado en <span className="font-bold">{data.actorAddress || "[DOMICILIO DEL ACTOR]"}</span>
                        {data.authorizedPersons && <>, y autorizando para tal efecto en los términos del artículo 46 del Código de Procedimientos Civiles a {data.authorizedPersons}</>}, ante Usted con el debido respeto comparezco a exponer:
                    </p>
                </div>

                {/* Demand */}
                <div className="text-justify mt-3">
                    <p>
                        Que por medio del presente escrito en la Vía Sumaria Civil y en ejercicio de la Acción de Alimentos, vengo a demandar al Sr. <span className="font-bold uppercase">{data.defendantName || "[NOMBRE DEL DEMANDADO]"}</span>, quien tiene su domicilio particular en <span className="font-bold">{data.defendantAddress || "[DOMICILIO DEL DEMANDADO]"}</span>, por las siguientes:
                    </p>
                </div>

                {/* Prestaciones */}
                <div className="text-center font-bold mt-4">
                    <p>P R E S T A C I O N E S :</p>
                </div>

                <div className="text-justify mt-3 space-y-3">
                    <p>
                        A).- Por el pago y el aseguramiento de una pensión alimenticia provisional, la cual deberá ser fijada de inmediato a criterio de su Señoría, a fin de satisfacer las necesidades alimenticias de la suscrita promovente y {data.children.length === 1 ? "de mi menor hija" : "de mis menores hijos"}{" "}
                        {data.children.map((child, index) => (
                            <span key={index} className="font-bold uppercase">
                                {child.name || "[NOMBRE]"}
                                {index < data.children.length - 1 ? ", " : ""}
                            </span>
                        ))}.
                    </p>
                    <p>
                        B).- Por el pago y el aseguramiento de una pensión alimenticia definitiva, que sea justa, suficiente y bastante a criterio de su Señoría para satisfacer las necesidades de la suscrita promovente y {data.children.length === 1 ? "de mi menor hija" : "de mis menores hijos"}{" "}
                        {data.children.map((child, index) => (
                            <span key={index} className="font-bold uppercase">
                                {child.name || "[NOMBRE]"}
                                {index < data.children.length - 1 ? ", " : ""}
                            </span>
                        ))}.
                    </p>
                    <p>C).- Por el pago de los gastos y las costas que se originen en el presente juicio.</p>
                </div>

                <div className="text-justify mt-3">
                    <p>Fundo la presente demanda en la siguiente relación de hechos y consideraciones de derecho:</p>
                </div>

                {/* Hechos */}
                <div className="text-center font-bold mt-4">
                    <p>H E C H O S :</p>
                </div>

                <div className="text-justify mt-3 space-y-3">
                    <p>
                        1.- Hace aproximadamente {data.relationshipStartDate || "[TIEMPO]"} que la suscrita promovente y el ahora demandado Sr. <span className="font-bold uppercase">{data.defendantName || "[NOMBRE DEL DEMANDADO]"}</span> nos conocimos e iniciamos una relación de noviazgo, haciendo expresamente la aclaración de que desde un principio vivimos habiendo mantenido y sostenido de manera periódica, es decir más o menos constante y reiterada, relaciones sexuales y desde luego una serie de convivencias como pareja.
                    </p>
                    <p>
                        2.- Como consecuencia de la relación de noviazgo ya señalada, {data.children.length === 1 ? `con fecha ${data.children[0]?.dob || "[FECHA]"} ocurrió el nacimiento de nuestra hija menor con nombre` : "ocurrieron los nacimientos de nuestros hijos menores con nombres"}{" "}
                        {data.children.map((child, index) => (
                            <span key={index} className="font-bold uppercase">
                                {child.name || "[NOMBRE]"}{data.children.length > 1 ? ` (nacido el ${child.dob || "[FECHA]"})` : ""}
                                {index < data.children.length - 1 ? ", " : ""}
                            </span>
                        ))}, tal y como se acredita con la exhibición que me permito realizar de {data.children.length === 1 ? "la respectiva acta de nacimiento debidamente certificada, reconocida" : "las respectivas actas de nacimiento debidamente certificadas, reconocidas"} por la parte demandada Sr. <span className="font-bold uppercase">{data.defendantName || "[NOMBRE]"}</span>.
                    </p>
                    <p>
                        3.- He de mencionar que si bien es cierto el demandado Sr. {(data.defendantName || "[NOMBRE]").toUpperCase()} no ha dejado a la suscrita y a {data.children.length === 1 ? "nuestra menor hija" : "nuestros menores hijos"} en completo estado de abandono, también lo es que sus aportaciones no han sido bastantes y suficientes ni con la periodicidad adecuadas para el debido sostenimiento de nuestro hogar y sobre todo por lo que a la pensión alimenticia se refiere; por lo que la situación para la suscrita y {data.children.length === 1 ? "nuestra menor hija" : "nuestros menores hijos"} ha sido muy difícil y complicada.
                    </p>
                    <p>
                        4.- En efecto, en un principio el ahora demandado única y exclusivamente me entregaba la cantidad de {data.previousAmount || "[MONTO]"} Pesos Moneda Nacional mensuales, y en últimas fechas mantiene periodos de hasta dos meses o más de tiempo sin que me haga aportación alguna, lo que impide que la suscrita pueda proveer lo suficiente al mantenimiento del hogar que contengo constituido con {data.children.length === 1 ? "nuestra menor hija" : "nuestros menores hijos"} y sobre todo por cuanto hace a todo lo que incluye el concepto alimentos, ya que me es muy difícil cubrir comidas, vestido, escuelas, medicinas, renta, transportación, esparcimiento y otros aspectos con las pocas aportaciones del demandado y con lo que la suscrita gano por mi trabajo.
                    </p>
                    <p>
                        5.- Es el caso, que desde {data.stopDate || "[FECHA]"} el ahora demandado Sr. <span className="font-bold uppercase">{data.defendantName || "[NOMBRE]"}</span> ha procedido a suspender todo tipo de ayuda, sobre todo la económica, tanto de la suscrita como de {data.children.length === 1 ? "nuestra menor hija" : "nuestros menores hijos"}, dejando de aportar cantidad alguna para los alimentos.
                    </p>
                    <p>
                        6.- En virtud de lo narrado con anterioridad y tomando en consideración que desde la fecha indicada el demandado se ha abstenido de proporcionar cantidad alguna para nuestro sostenimiento, es por lo que me veo en la imperiosa necesidad de plantearle la presente demanda solicitando a su Señoría se fije a la brevedad posible la pensión alimenticia que en derecho proceda.
                    </p>
                </div>

                {/* Ofrecimiento de Pruebas */}
                <div className="text-center font-bold mt-4">
                    <p>OFRECIMIENTO DE PRUEBAS</p>
                </div>

                <div className="text-justify mt-3">
                    <p>En este apartado ofrezco como pruebas de mi parte, mismas que relaciono con todos y cada uno de los puntos de hechos de mi demanda, en los términos del artículo 287 del Código de Procedimientos Civiles vigente, las siguientes:</p>
                </div>

                <div className="text-justify mt-3 space-y-3">
                    <p>
                        1.- LA CONFESIONAL DIRECTA O PROVOCADA a cargo de la parte demandada, el Sr. <span className="font-bold uppercase">{data.defendantName || "[NOMBRE]"}</span>, quien deberá absolver personalmente y no por medio de apoderado legal alguno el pliego de posiciones que en sobre cerrado se acompaña, el día y hora que se señale para tal efecto, apercibido de ser declarado confeso si no comparece sin justa causa en los términos de Ley. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.
                    </p>
                    <p>
                        2.- LA TESTIMONIAL consistente en la declaración de {data.witnesses.length === 1 ? "un testigo" : `${data.witnesses.length} testigos`} a quienes les constan los hechos materia de la presente demanda y a quienes me comprometo a presentar ante este H. Juzgado el día y hora que se señale para el desahogo de dicha probanza, {data.witnesses.length === 1 ? "es:" : "ellos son:"}
                    </p>
                    {data.witnesses.map((w, index) => (
                        <p key={index} className="ml-8">
                            {String.fromCharCode(97 + index)}).- {(w.name || "[TESTIGO]").toUpperCase()}
                        </p>
                    ))}
                    <p>Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.</p>
                    <p>
                        3.- LA DOCUMENTAL PUBLICA consistente en {data.children.length === 1 ? "la acta de nacimiento de mi menor hija" : "las actas de nacimiento de mis menores hijos"}{" "}
                        {data.children.map((child, index) => (
                            <span key={index} className="font-bold uppercase">
                                {child.name || "[NOMBRE]"}
                                {index < data.children.length - 1 ? ", " : ""}
                            </span>
                        ))}{" "}
                        que se acompañan con la presente demanda. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.
                    </p>
                    <p>4.- PRESUNCIONAL LEGAL Y HUMANA consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie a mis intereses. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.</p>
                    <p>5.- LA INSTRUMENTAL PUBLICA DE ACTUACIONES consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie a mis intereses. Esta prueba la relaciono con los puntos 1, 2, 3, 4, 5 y 6 de los hechos de mi demanda, en los términos del artículo 287 del Código Adjetivo.</p>
                </div>

                {/* Capítulo Especial */}
                <div className="text-center font-bold mt-4">
                    <p>CAPITULO ESPECIAL</p>
                </div>

                <div className="text-justify mt-3">
                    <p>
                        En este apartado y con fundamento en lo dispuesto por los artículos 312 Fracciones I y II, 314 y demás relativos del Código Civil en vigor, en relación con los artículos 214, 925, 926, 927, 929, 930 y demás relativos del Código de Procedimientos Civiles vigente en el Estado, solicito se fije de inmediato y a manera de medida provisional una pensión alimenticia que sea bastante y suficiente a cubrir las necesidades que por ese concepto tenemos tanto la suscrita como {data.children.length === 1 ? "mi menor hija" : "mis menores hijos"}.
                    </p>
                </div>

                {/* Capítulo de Derecho */}
                <div className="text-center font-bold mt-4">
                    <p>CAPITULO DE DERECHO</p>
                </div>

                <div className="text-justify mt-3 space-y-3">
                    <p>Son aplicables en cuanto al fondo del presente asunto lo dispuesto por los artículos 298, 299, 300, 305, 306, 308, 312, 313, 314, 318, 320 y demás relativos del Código Civil en vigor.</p>
                    <p>En cuanto al Procedimiento lo rige lo establecido por los artículos del 424 al 435 del Código De Procedimientos Civiles vigente en el Estado.</p>
                    <p>Por lo anteriormente expuesto y fundado a Usted C. Juez de lo Civil en turno atentamente pido se sirva:</p>
                </div>

                <div className="text-justify mt-3 space-y-2">
                    <p>PRIMERO.- Tenerme por presentada con este escrito y documentos anexos demandando al Sr. <span className="font-bold uppercase">{data.defendantName || "[NOMBRE]"}</span> por las prestaciones que se reclaman.</p>
                    <p>SEGUNDO.- Admitir la demanda en la vía y forma propuesta ordenando el emplazamiento de la parte demandada en los términos de ley.</p>
                    <p>TERCERO.- Por ofrecidas las pruebas que se indican, mismas que pido se manden desahogar en la audiencia respectiva.</p>
                    <p>CUARTO.- Dictar proveído en el que se fije la pensión alimenticia provisional y en su oportunidad la definitiva que sea bastante y suficiente para garantizar las necesidades alimenticias de la suscrita actora y {data.children.length === 1 ? "nuestra menor hija" : "nuestros menores hijos"}, ordenando su aseguramiento en los términos solicitados.</p>
                    <p>QUINTO.- En su oportunidad dictar Sentencia Definitiva en la que se condene al demandado al pago de las prestaciones reclamadas.</p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 space-y-6">
                    <p>PROTESTO LO NECESARIO</p>
                    <p>{data.city || "[CIUDAD]"}, al día de su presentación.</p>

                    <div className="mt-12">
                        <p>_____________________________</p>
                        <p className="font-bold uppercase mt-2">{data.actorName || "[NOMBRE DEL ACTOR]"}</p>
                        <p className="mt-4">ABOGADO PROCURADOR</p>
                    </div>
                </div>
            </div>
        </Card>
    )
}
