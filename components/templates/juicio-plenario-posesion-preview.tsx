interface JuicioPlenarioPosesionData {
    actorNames: { name: string }[]
    defendantName: string
    actorAddress: string
    defendantAddress: string
    authorizedAttorneys?: string
    propertyLotNumber: string
    propertyBlock: string
    propertyNeighborhood: string
    propertyDelegation: string
    propertyCity: string
    propertyArea: string
    propertyBoundaries: {
        north: string
        south: string
        east: string
        west: string
    }
    acquisitionMethod: string
    courtName: string
    caseNumber: string
    sentenceDate: string
    possessionStartDate: string
    purchaseContractDate?: string
    previousOwner?: string
    registryNumber: string
    registrySection: string
    registryDate: string
    relationshipToDefendant: string
    dispossessionDate: string
    dispossessionCircumstances: string
    confrontationAttempts: string
    city: string
}

interface PreviewProps {
    data: JuicioPlenarioPosesionData
}

export function JuicioPlenarioPosesionPreview({ data }: PreviewProps) {
    const actorNamesText = data.actorNames.map(a => a.name.toUpperCase()).join(' Y ')

    return (
        <div className="live-preview-content text-black p-12 shadow-lg min-h-full" style={{ fontFamily: 'Georgia, serif', backgroundColor: '#ffffff' }}>
            {/* CARÁTULA */}
            <div className="text-right mb-8">
                <p className="font-bold">{actorNamesText || '[NOMBRE DE LOS ACTORES]'}</p>
                <p className="mt-4 font-bold">VS.</p>
                <p className="mt-4 font-bold">{data.defendantName.toUpperCase() || '[NOMBRE DEL DEMANDADO]'}</p>
                <p className="mt-4 font-bold">ORDINARIO CIVIL</p>
                <p className="mt-4 font-bold">I N I C I O</p>
            </div>

            {/* Judge Address */}
            <div className="mb-6">
                <p className="font-bold">C. JUEZ DE LO CIVIL EN TURNO.</p>
            </div>

            {/* Introduction */}
            <div className="text-justify mb-6">
                <p>
                    <span className="font-bold">{actorNamesText || '[NOMBRE DE LOS ACTORES]'}</span>
                    , mexicanos, mayores de edad, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el ubicado en{' '}
                    <span className="font-bold">{data.actorAddress || '[DOMICILIO DEL ACTOR]'}</span>
                    {data.authorizedAttorneys && (
                        <span>, y autorizando para tal efecto en los términos del artículo 46 del Código de Procedimientos Civiles a {data.authorizedAttorneys}</span>
                    )}
                    , ante Usted con el debido respeto comparecemos a exponer:
                </p>
            </div>

            {/* Demand Statement */}
            <div className="text-justify mb-6">
                <p>
                    Que por medio del presente ocurso, vengo a demandar en la vía{' '}
                    <span className="font-bold">ORDINARIA CIVIL</span>, ejercitando la{' '}
                    <span className="font-bold">ACCIÓN PLENARIA DE POSESIÓN</span>, en contra de{' '}
                    <span className="font-bold">{data.defendantName.toUpperCase() || '[NOMBRE DEL DEMANDADO]'}</span>
                    , quien tiene su domicilio en{' '}
                    <span className="font-bold">{data.defendantAddress || '[DOMICILIO DEL DEMANDADO]'}</span>
                    , basándome en los siguientes:
                </p>
            </div>

            {/* PRESTACIONES */}
            <div className="mb-6">
                <p className="font-bold mb-2">PRESTACIONES:</p>

                <div className="text-justify space-y-3">
                    <p>
                        <span className="font-bold">A) </span>
                        La declaración judicial de que tengo mejor derecho a poseer el inmueble objeto de este juicio.
                    </p>

                    <p>
                        <span className="font-bold">B) </span>
                        La entrega material y jurídica del inmueble objeto de este juicio.
                    </p>

                    <p>
                        <span className="font-bold">C) </span>
                        El pago de frutos, accesorios y mejoras que se hubieren realizado al inmueble.
                    </p>

                    <p>
                        <span className="font-bold">D) </span>
                        El pago de gastos y costas que se generen con motivo del presente juicio.
                    </p>
                </div>
            </div>

            {/* HECHOS */}
            <div className="mb-6">
                <p className="font-bold mb-2">HECHOS:</p>

                <div className="text-justify space-y-3">
                    <p>
                        <span className="font-bold">1. </span>
                        Que soy legítima propietaria del inmueble identificado como Lote{' '}
                        {data.propertyLotNumber || '[#]'}, Manzana {data.propertyBlock || '[#]'}, ubicado en la Colonia{' '}
                        {data.propertyNeighborhood || '[COLONIA]'}, Delegación {data.propertyDelegation || '[DELEGACIÓN]'},
                        de esta Ciudad de {data.propertyCity || '[CIUDAD]'}, Baja California, con una superficie aproximada de{' '}
                        {data.propertyArea || '[SUPERFICIE]'}, con las siguientes medidas y colindancias: AL NORTE:{' '}
                        {data.propertyBoundaries.north || '[LINDERO NORTE]'}; AL SUR:{' '}
                        {data.propertyBoundaries.south || '[LINDERO SUR]'}; AL ESTE:{' '}
                        {data.propertyBoundaries.east || '[LINDERO ESTE]'}; y AL OESTE:{' '}
                        {data.propertyBoundaries.west || '[LINDERO OESTE]'}.
                    </p>

                    <p>
                        <span className="font-bold">2. </span>
                        Que adquirí la propiedad del inmueble antes descrito mediante{' '}
                        {data.acquisitionMethod || '[MÉTODO DE ADQUISICIÓN]'}, promovido ante el{' '}
                        {data.courtName || '[NOMBRE DEL JUZGADO]'}, bajo el expediente número{' '}
                        {data.caseNumber || '[NÚMERO DE EXPEDIENTE]'}, dictándose sentencia en fecha{' '}
                        {data.sentenceDate || '[FECHA DE SENTENCIA]'}.
                    </p>

                    <p>
                        <span className="font-bold">3. </span>
                        Que dicha sentencia fue debidamente inscrita en el Registro Público de la Propiedad y del Comercio bajo el folio número{' '}
                        {data.registryNumber || '[FOLIO]'}, Sección {data.registrySection || '[SECCIÓN]'}, en fecha{' '}
                        {data.registryDate || '[FECHA DE REGISTRO]'}.
                    </p>

                    <p>
                        <span className="font-bold">4. </span>
                        Que el demandado {data.defendantName.toUpperCase() || '[NOMBRE DEL DEMANDADO]'} es mi{' '}
                        {data.relationshipToDefendant || '[RELACIÓN]'}, con quien he mantenido una relación familiar.
                    </p>

                    <p>
                        <span className="font-bold">5. </span>
                        Que aproximadamente en fecha {data.dispossessionDate || '[FECHA]'}, el demandado se apoderó del inmueble de mi propiedad, bajo las siguientes circunstancias:{' '}
                        {data.dispossessionCircumstances || '[CIRCUNSTANCIAS DEL DESPOJO]'}
                    </p>

                    <p>
                        <span className="font-bold">6. </span>
                        Que he realizado diversos intentos para recuperar la posesión de mi propiedad, específicamente:{' '}
                        {data.confrontationAttempts || '[INTENTOS DE RECUPERACIÓN]'}
                    </p>

                    <p>
                        <span className="font-bold">7. </span>
                        Que obtuve el título de propiedad debidamente inscrito en fecha{' '}
                        {data.sentenceDate || '[FECHA]'}, lo cual acredita mi legítimo derecho a poseer el inmueble.
                    </p>

                    <p>
                        <span className="font-bold">8. </span>
                        Que posteriormente volví a confrontar al demandado, quien persistió en su negativa de desocupar el inmueble.
                    </p>

                    <p>
                        <span className="font-bold">9. </span>
                        Que el demandado no cuenta con título legítimo alguno que acredite su derecho a poseer el inmueble objeto del presente juicio.
                    </p>

                    <p>
                        <span className="font-bold">10. </span>
                        Que siendo mi voluntad recuperar la posesión del inmueble que legítimamente me pertenece, acudo ante esta autoridad para ejercitar la presente acción plenaria de posesión.
                    </p>
                </div>
            </div>

            {/* CAPÍTULO DE DERECHO */}
            <div className="mb-6">
                <p className="font-bold mb-2">CAPÍTULO DE DERECHO:</p>

                <div className="text-justify space-y-3">
                    <p>
                        Fundo mi acción en los artículos 8, 1143, 2122, 2123, 2140, 2143 y 2144 del Código Civil del Estado de Baja California.
                    </p>

                    <p className="font-bold">JURISPRUDENCIA:</p>

                    <p>
                        <span className="italic">"POSESION. ACCION PLENARIA DE. REQUISITOS." </span>
                        La acción plenaria de posesión requiere que el actor acredite: 1) La posesión del inmueble; 2) Que dicha posesión sea en concepto de propietario; 3) El despojo o perturbación en la posesión; y 4) Que el demandado no tenga mejor derecho a poseer.
                    </p>
                </div>
            </div>

            {/* PETITIONS */}
            <div className="mb-6">
                <p className="font-bold mb-2">Por lo expuesto y fundado, a Usted C. Juez, atentamente solicito:</p>

                <div className="text-justify space-y-3">
                    <p>
                        <span className="font-bold">PRIMERO. </span>
                        Tenerme por presentada con este escrito, demandando en la vía ordinaria civil al ciudadano{' '}
                        <span className="font-bold">{data.defendantName.toUpperCase() || '[NOMBRE DEL DEMANDADO]'}</span>.
                    </p>

                    <p>
                        <span className="font-bold">SEGUNDO. </span>
                        Admitir la presente demanda y ordenar el emplazamiento del demandado.
                    </p>

                    <p>
                        <span className="font-bold">TERCERO. </span>
                        En su momento procesal oportuno, dictar sentencia en la que se declare procedente la acción plenaria de posesión ejercitada.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8">
                <p className="text-center font-bold mb-4">PROTESTO LO NECESARIO</p>

                <p className="text-right mb-8">
                    {data.city || 'Tijuana, Baja California'}, a {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                {/* Signatures */}
                <div className="space-y-6">
                    {data.actorNames.map((actor, index) => (
                        <div key={index} className="text-center">
                            <p className="mb-2">_________________________________</p>
                            <p className="font-bold">{actor.name.toUpperCase() || `[ACTOR ${index + 1}]`}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
