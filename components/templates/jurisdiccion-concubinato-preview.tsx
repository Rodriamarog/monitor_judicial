interface JurisdiccionConcubinatoData {
    applicantName: string
    applicantAddress: string
    authorizedAttorneys?: string
    deceasedName: string
    relationshipStartMonth: string
    relationshipStartYear: string
    sharedAddress: string
    deathDate: string
    deathCity: string
    hasChildren: 'yes' | 'no'
    childrenNote?: string
    relationshipYears: string
    witnesses: { name: string }[]
    city: string
}

interface PreviewProps {
    data: JurisdiccionConcubinatoData
}

export function JurisdiccionConcubinatoPreview({ data }: PreviewProps) {
    const witnessNames = data.witnesses.map(w => w.name.toUpperCase()).join(' Y ')

    return (
        <div className="live-preview-content text-black p-12 shadow-lg min-h-full" style={{ fontFamily: 'Georgia, serif', backgroundColor: '#ffffff' }}>
            {/* CARÁTULA */}
            <div className="text-right mb-8">
                <p className="font-bold">{data.applicantName.toUpperCase() || '[NOMBRE DEL SOLICITANTE]'}</p>
                <p className="mt-4 font-bold">JURISDICCION VOLUNTARIA</p>
                <p className="mt-4 font-bold">I N I C I O</p>
            </div>

            {/* Judge Address */}
            <div className="mb-6">
                <p className="font-bold">C. JUEZ DE LO FAMILIAR EN TURNO.</p>
            </div>

            {/* Introduction */}
            <div className="text-justify mb-6">
                <p>
                    <span className="font-bold">{data.applicantName.toUpperCase() || '[NOMBRE DEL SOLICITANTE]'}</span>
                    , mexicana, mayor de edad, por nuestro propio derecho, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el ubicado en{' '}
                    <span className="font-bold">{data.applicantAddress || '[DOMICILIO DEL SOLICITANTE]'}</span>
                    {data.authorizedAttorneys && (
                        <span>, y autorizando para tal efecto en los términos del artículo 46 del Código de Procedimientos Civiles vigente en el Estado, a {data.authorizedAttorneys}</span>
                    )}
                    , ante Usted con el debido respeto comparezco a exponer:
                </p>
            </div>

            {/* Purpose Statement */}
            <div className="text-justify mb-6">
                <p>
                    Que por medio del presente escrito y con fundamento en lo dispuesto por los artículos de 878 al 886 y demás relativos del Código de Procedimientos Civiles Vigentes vengo a promover en{' '}
                    <span className="font-bold">VIA DE JURISDICCION VOLUNTARIA DILIGENCIAS DE INFORMACIÓN TESTIMONIAL</span>, con el objeto de acreditar la relación de{' '}
                    <span className="font-bold">CONCUBINATO</span> que sostuve, la suscrita promovente,{' '}
                    <span className="font-bold">{data.applicantName.toUpperCase() || '[NOMBRE DEL SOLICITANTE]'}</span> con el Sr.{' '}
                    <span className="font-bold">{data.deceasedName.toUpperCase() || '[NOMBRE DEL FINADO]'}</span> hoy finado, y para tal efecto me permito ofrecer la prueba testimonial a cargo de dos personas, mexicanas, mayores de edad y aptas para testificar y a quienes me comprometo a presentar ante este H. Juzgado en días y horas hábiles que se señalen para su recepción, con el fin de que contesten el interrogatorio directo que se les formulará, por conducto de mi Abogado Procurador.
                </p>
            </div>

            {/* HECHOS Header */}
            <div className="text-justify mb-6">
                <p>Fundamos la presente instancia en la siguiente relación de HECHOS y consideraciones de DERECHO:</p>
            </div>

            <div className="mb-6">
                <p className="font-bold">H E C H O S:</p>
            </div>

            {/* HECHOS */}
            <div className="text-justify space-y-4 mb-6">
                <p>
                    <span className="font-bold">1.- </span>
                    La suscrita promovente,{' '}
                    <span className="font-bold">{data.applicantName.toUpperCase() || '[NOMBRE DEL SOLICITANTE]'}</span> manifiesto bajo protesta de decir verdad que en el mes de{' '}
                    <span className="font-bold">{data.relationshipStartMonth || '[MES]'}</span> del año de{' '}
                    <span className="font-bold">{data.relationshipStartYear || '[AÑO]'}</span>, conocí al Sr.{' '}
                    <span className="font-bold">{data.deceasedName.toUpperCase() || '[NOMBRE DEL FINADO]'}</span>, habiendo desarrollado una muy buena empatía, por lo que a finales de ese mismo año iniciamos una relación personal íntima de concubinato, ya que procedimos a establecer al efecto nuestro domicilio común en{' '}
                    <span className="font-bold">{data.sharedAddress || '[DOMICILIO COMPARTIDO]'}</span>.
                </p>

                <p>
                    <span className="font-bold">2.- </span>
                    En base a dicha relación de concubinato, ambas partes, es decir la suscrita promovente y el Sr.{' '}
                    <span className="font-bold">{data.deceasedName.toUpperCase() || '[NOMBRE DEL FINADO]'}</span> adquirimos los derechos y las obligaciones propias como si estuviéramos unidos en matrimonio, toda vez que incluso desde el origen de nuestra relación ambos contribuimos al sostenimiento del hogar.
                </p>

                <p>
                    <span className="font-bold">3.- </span>
                    Es el caso, que mi concubino el Sr.{' '}
                    <span className="font-bold">{data.deceasedName.toUpperCase() || '[NOMBRE DEL FINADO]'}</span> desafortunadamente con fecha{' '}
                    <span className="font-bold">{data.deathDate || '[FECHA DE FALLECIMIENTO]'}</span> falleció en{' '}
                    <span className="font-bold">{data.deathCity || '[CIUDAD]'}</span>, tal y como lo acredito con la respectiva certificación de su acta de defunción que me permito exhibir con la presente solicitud.
                </p>

                <p>
                    <span className="font-bold">4.- </span>
                    {data.hasChildren === 'no'
                        ? 'Es preciso señalar que durante nuestra relación de concubinato no procreamos hijo alguno, desconociendo así mismo si le sobrevive por separado algún hijo en otra relación que hubiese tenido; por lo tanto considero ser la única beneficiaria de la totalidad de sus derechos laborales, de jubilación y demás.'
                        : `Durante nuestra relación de concubinato ${data.childrenNote || 'procreamos hijos'}.`}
                </p>

                <p>
                    <span className="font-bold">5.- </span>
                    Finalmente me permito manifestar que nuestra relación de concubinato la conservamos hasta el último día de la existencia de mi concubino, esto es, hasta la fecha de defunción del Sr.{' '}
                    <span className="font-bold">{data.deceasedName.toUpperCase() || '[NOMBRE DEL FINADO]'}</span>, sucedido, como se ha dicho, desde el mes de{' '}
                    <span className="font-bold">{data.relationshipStartMonth || '[MES]'}</span> de{' '}
                    <span className="font-bold">{data.relationshipStartYear || '[AÑO]'}</span> hasta, por lo que nuestra relación duró{' '}
                    <span className="font-bold">{data.relationshipYears || '[#]'}</span> años. Todo lo cual pretendo acreditar con las documentales anexas y la información testimonial que al efecto se ofrece más adelante.
                </p>
            </div>

            {/* TESTIMONIAL INFORMATION */}
            <div className="mb-6">
                <p className="font-bold mb-2">INFORMACIÓN TESTIMONIAL</p>
                <div className="text-justify">
                    <p>
                        A fin de acreditar los hechos narrados, me permito ofrecer desde ahora la información testimonial que correrá a cargo de los Sres.{' '}
                        <span className="font-bold">{witnessNames || '[TESTIGOS]'}</span>, a quienes me comprometo a presentar ante H. Juzgado el día y hora que señale para el desahogo de dicha probanza.
                    </p>
                </div>
            </div>

            {/* JURISPRUDENCE */}
            <div className="mb-6">
                <p className="font-bold text-justify mb-2">
                    CONCUBINATO. LAS DILIGENCIAS DE JURISDICCIÓN VOLUNTARIA SON APTAS PARA ACREDITAR ESA RELACIÓN (LEGISLACIÓN DEL ESTADO DE VERACRUZ).
                </p>
                <div className="text-justify space-y-2">
                    <p>
                        El artículo 261, fracción VIII, del Código de Procedimientos Civiles para el Estado de Veracruz señala que las actuaciones judiciales de toda especie se consideran documentales públicas. Por su parte, el artículo 326 del mismo ordenamiento señala que las actuaciones judiciales hacen prueba plena; por tanto, hasta en tanto estos documentos no sean declarados nulos, deben surtir todos sus efectos legales.
                    </p>
                    <p className="font-bold">SEGUNDO TRIBUNAL COLEGIADO EN MATERIA CIVIL DEL SÉPTIMO CIRCUITO.</p>
                    <p>VII.2o.C.209 C (10a.)</p>
                </div>
            </div>

            {/* PETITIONS */}
            <div className="mb-6">
                <p className="text-justify mb-2">Por lo expuesto y fundado, a Usted C. Juez atentamente pido se sirva:</p>
                <div className="text-justify space-y-3">
                    <p>
                        <span className="font-bold">PRIMERO.- </span>
                        Tenerme por presentada con este escrito promoviendo en Vía de Jurisdicción Voluntaria Diligencias de información Testimonial para acreditar diversos hechos relativos al concubinato.
                    </p>

                    <p>
                        <span className="font-bold">SEGUNDO.- </span>
                        Admitir la instancia en la Vía y forma propuestas ordenando se dé vista al C. Agente del Ministerio Público Adscrito a este H. Juzgado para los efectos de su representación.
                    </p>

                    <p>
                        <span className="font-bold">TERCERO.- </span>
                        Mandar recibir la información testimonial que se ofrece.
                    </p>

                    <p>
                        <span className="font-bold">CUARTO.- </span>
                        En su oportunidad solicito se me expida copia certificada por duplicado de todo lo actuado en la presente instancia autorizando para que las reciba en mi nombre a los profesionistas ya autorizados con antelación.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8">
                <p className="text-center font-bold mb-4">PROTESTO LO NECESARIO</p>

                <p className="text-right mb-8">
                    {data.city || 'Tijuana, B.C.'}, a su fecha de presentación.
                </p>

                {/* Signature */}
                <div className="text-center">
                    <p className="mb-2">_________________________________</p>
                    <p className="font-bold">{data.applicantName.toUpperCase() || '[NOMBRE DEL SOLICITANTE]'}</p>
                </div>
            </div>
        </div>
    )
}
