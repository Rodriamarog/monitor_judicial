interface OfrecimientoPruebasData {
    caseNumber: string
    plaintiffNames: string
    defendantNames: string
    caseType: string
    judgeName: string
    attorneyName: string
    demandFactsReference: string
    hasConfessional1: boolean
    confessional1Defendant?: string
    confessional1Type?: string
    hasConfessional2: boolean
    confessional2Defendant?: string
    confessional2Type?: string
    hasDocumentaryPrivate: boolean
    documentaryPrivateDescription?: string
    hasDocumentaryPublic: boolean
    documentaryPublicDescription?: string
    hasExpert: boolean
    expertName?: string
    expertDescription?: string
    hasTestimonial: boolean
    witnesses?: { name: string }[]
    city: string
}

interface PreviewProps {
    data: OfrecimientoPruebasData
}

export function OfrecimientoPruebasPreview({ data }: PreviewProps) {
    let evidenceNumber = 1

    return (
        <div className="live-preview-content text-black p-12 shadow-lg min-h-full" style={{ fontFamily: 'Georgia, serif', backgroundColor: '#ffffff' }}>
            {/* CARÁTULA */}
            <div className="text-right mb-8">
                <p className="font-bold">EXPEDIENTE.- {data.caseNumber || '[NÚMERO DE EXPEDIENTE]'}</p>
                <p className="mt-4 font-bold">{data.plaintiffNames.toUpperCase() || '[NOMBRES DE ACTORES]'}</p>
                <p className="mt-4 font-bold">VS.</p>
                <p className="mt-4 font-bold">{data.defendantNames.toUpperCase() || '[NOMBRES DE DEMANDADOS]'}</p>
                <p className="mt-4 font-bold">{data.caseType.toUpperCase() || 'JUICIO ORDINARIO CIVIL'}</p>
            </div>

            {/* Judge Address */}
            <div className="mb-6">
                <p className="font-bold">{data.judgeName.toUpperCase() || 'C. JUEZ'}</p>
            </div>

            {/* Introduction */}
            <div className="text-justify mb-6">
                <p>
                    <span className="font-bold">{data.attorneyName.toUpperCase() || '[NOMBRE DEL ABOGADO]'}</span>
                    , en mi carácter Abogado Procurador de la Parte Actora, personería que tengo debidamente acreditada en los autos del juicio al rubro indicado, ante Usted con el debido respeto comparezco a exponer:
                </p>
            </div>

            {/* Purpose Statement */}
            <div className="text-justify mb-6">
                <p>
                    Que por medio del presente escrito y con fundamento en lo dispuesto por los artículos del 274 al 418 y demás relativos del Código de Procedimientos Civiles vigente en el Estado, vengo a{' '}
                    <span className="font-bold">HACER EL OFRECIMIENTO DE LAS PRUEBAS</span> que son a mi cargo de dentro del presente expediente, relacionándolas debidamente con los puntos de hechos de mi demanda, según lo previene el artículo 287 del ordenamiento legal invocado, todo ello particularmente en los siguientes términos:
                </p>
            </div>

            {/* Evidence Header */}
            <div className="mb-6">
                <p className="font-bold">OFRECIMIENTO DE PRUEBAS:</p>
            </div>

            {/* Evidence List */}
            <div className="text-justify space-y-4 mb-6">
                {/* Confessional 1 */}
                {data.hasConfessional1 && data.confessional1Defendant && (
                    <p>
                        <span className="font-bold">{evidenceNumber++}.- LA CONFESIONAL DIRECTA O PROVOCADA</span>, a cargo del Sr. {data.confessional1Defendant.toUpperCase()} quien deberá absolver posiciones {data.confessional1Type || 'personalmente'}, y no por medio de apoderado alguno, el día y hora que se señale para el desahogo de dicha probanza, con el apercibimiento de ser declarada confesa si no comparece sin justa causa. Esta prueba la relaciono con los puntos de hechos {data.demandFactsReference} de mi demanda.
                    </p>
                )}

                {/* Confessional 2 */}
                {data.hasConfessional2 && data.confessional2Defendant && (
                    <p>
                        <span className="font-bold">{evidenceNumber++}.- LA CONFESIONAL DIRECTA O PROVOCADA</span>, a cargo del co-demandado {data.confessional2Defendant.toUpperCase()} quien deberá absolver posiciones {data.confessional2Type || 'por medio de su representante legal'}, el día y hora que se señale para el desahogo de dicha probanza, con el apercibimiento de ser declarada confesa si no comparece sin justa causa. Esta prueba la relaciono con los puntos de hechos {data.demandFactsReference} de mi demanda.
                    </p>
                )}

                {/* Documentary Private */}
                {data.hasDocumentaryPrivate && data.documentaryPrivateDescription && (
                    <p>
                        <span className="font-bold">{evidenceNumber++}.- LA DOCUMENTAL PRIVADA</span>, consistente en {data.documentaryPrivateDescription}. Esta prueba la relaciono con los puntos de hechos {data.demandFactsReference} de mi demanda.
                    </p>
                )}

                {/* Documentary Public */}
                {data.hasDocumentaryPublic && data.documentaryPublicDescription && (
                    <p>
                        <span className="font-bold">{evidenceNumber++}.- LAS DOCUMENTALES PUBLICAS</span>, consistente en {data.documentaryPublicDescription}. Esta prueba la relaciono con los puntos de hechos {data.demandFactsReference} de mi demanda.
                    </p>
                )}

                {/* Expert */}
                {data.hasExpert && data.expertName && data.expertDescription && (
                    <p>
                        <span className="font-bold">{evidenceNumber++}.- LA PERICIAL</span>, consistente en dictamen pericial del perito {data.expertName} {data.expertDescription}. Esta prueba la relaciono con los puntos de hechos {data.demandFactsReference} de mi demanda.
                    </p>
                )}

                {/* Testimonial */}
                {data.hasTestimonial && data.witnesses && data.witnesses.length > 0 && (
                    <>
                        <p>
                            <span className="font-bold">{evidenceNumber++}.- LA TESTIMONIAL</span>, consistente en la declaración de {data.witnesses.length} testigos los cuales tienen conocimiento de los hechos controvertidos y a quienes me comprometo a presentar ante éste H. Juzgado el día y hora que se señale para el desahogo de dicha probanza, mismos que deberán responder al interrogatorio que se les formulara, el día y hora señalado para que tenga verificativo dicha probanza ellos son:
                        </p>
                        <div className="ml-8 space-y-1">
                            {data.witnesses.filter(w => w.name).map((witness, idx) => (
                                <p key={idx} className="font-bold">{witness.name.toUpperCase()}</p>
                            ))}
                        </div>
                        <p>
                            Esta prueba la relaciono con los puntos de hechos {data.demandFactsReference} de mi demanda.
                        </p>
                    </>
                )}

                {/* Presumptive Evidence */}
                <p>
                    <span className="font-bold">{evidenceNumber++}.- LA PRESUNCIONAL LEGAL Y HUMANA</span>, consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie a mis intereses. Esta prueba la relaciono con todos los puntos de hechos de mi demanda y contestación a la reconvención, art. 287 del Código Adjetivo.
                </p>

                {/* Instrumental Evidence */}
                <p>
                    <span className="font-bold">{evidenceNumber++}.- LA INSTRUMENTAL PUBLICA DE ACTUACIONES</span>, consistente en todo lo actuado y que se llegue a actuar en el presente expediente y hasta en tanto beneficie mis intereses. Esta prueba la relaciono con todos los puntos de hechos de mi demanda y contestación a la reconvención, art. 287 del Código Adjetivo.
                </p>
            </div>

            {/* Petition */}
            <div className="text-justify mb-6">
                <p className="mb-4">Por lo expuesto y fundado, a Usted C. JUEZ atentamente pedimos se sirva:</p>
                <p>
                    <span className="font-bold">UNICO.- </span>
                    Tenerme por presentado con este escrito y documentos anexos, haciendo en tiempo y forma, el ofrecimiento de las pruebas, mismas que se encuentran debidamente relacionadas en los términos de Ley y que solicito que en su oportunidad sean admitidas en su totalidad por estar ajustadas a derecho y no atentar contra la moral ni las buenas costumbres.
                </p>
            </div>

            {/* Footer */}
            <div className="mt-8">
                <p className="text-center font-bold mb-4">PROTESTO LO NECESARIO</p>

                <p className="text-right mb-8">
                    {data.city || 'Tijuana, B.C.'}, al día de su presentación.
                </p>

                {/* Signature */}
                <div className="text-center space-y-1">
                    <p className="mb-2">_________________________________</p>
                    <p className="font-bold">{data.attorneyName.toUpperCase() || '[NOMBRE DEL ABOGADO]'}</p>
                    <p>ABOGADO PROCURADOR</p>
                </div>
            </div>
        </div>
    )
}
