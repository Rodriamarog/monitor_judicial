interface PrescripcionData {
    plaintiffName: string
    plaintiffAddress: string
    authorizedAttorneys?: string
    defendant1Name: string
    defendant1Address?: string
    defendant2Name?: string
    defendant2Address?: string
    lotNumber: string
    blockNumber: string
    developmentName: string
    propertyLocation: string
    delegation: string
    propertyArea: string
    boundaryNorthwest: string
    boundarySouthwest: string
    boundarySoutheast: string
    boundaryNortheast: string
    possessionStartDate: string
    previousOwner: string
    purchaseDate: string
    registryParty: string
    registrySection: string
    registryDate: string
    registeredOwner: string
    city: string
}

interface PreviewProps {
    data: PrescripcionData
}

export function PrescripcionPreview({ data }: PreviewProps) {
    return (
        <div className="live-preview-content text-black p-12 shadow-lg min-h-full" style={{ fontFamily: 'Georgia, serif', backgroundColor: '#ffffff' }}>
            {/* CARÁTULA */}
            <div className="text-right mb-8">
                <p className="font-bold">{data.plaintiffName.toUpperCase() || '[NOMBRE DEL ACTOR]'}</p>
                <p className="mt-4 font-bold">VS.</p>
                <p className="mt-4 font-bold">{data.defendant1Name.toUpperCase() || '[NOMBRE DEL DEMANDADO]'}</p>
                {data.defendant2Name && (
                    <p className="mt-4 font-bold">{data.defendant2Name.toUpperCase()}</p>
                )}
                <p className="mt-4 font-bold">JUICIO ORDINARIO CIVIL</p>
                <p className="mt-4 font-bold">I N I C I O</p>
            </div>

            {/* Judge Address */}
            <div className="mb-6">
                <p className="font-bold">C. JUEZ DE PRIMERA INSTANCIA DE LO CIVIL EN TURNO</p>
                <p className="mt-2 font-bold">P R E S E N T E.-</p>
            </div>

            {/* Introduction */}
            <div className="text-justify mb-6">
                <p>
                    <span className="font-bold">{data.plaintiffName.toUpperCase() || '[NOMBRE DEL ACTOR]'}</span>
                    , mexicano, mayor de edad, por mi propio derecho, señalando como domicilio para oír y recibir toda clase de notificaciones y documentos el despacho ubicado en{' '}
                    <span className="font-bold">{data.plaintiffAddress || '[DOMICILIO]'}</span>
                    {data.authorizedAttorneys && (
                        <span> y designando como mis Abogados Procuradores con la totalidad de facultades contenidas en el artículo 46 del Código de Procedimientos Civiles vigente en el Estado, a los CC. Licenciados {data.authorizedAttorneys}</span>
                    )}
                    , ante Usted con el debido respeto comparecemos a exponer:
                </p>
            </div>

            {/* Demand Statement */}
            <div className="text-justify mb-6">
                <p>
                    Que en los términos del presente escrito,{' '}
                    <span className="font-bold">EN LA VIA ORDINARIA CIVIL</span> y en ejercicio de la{' '}
                    <span className="font-bold">Acción de Prescripción Adquisitiva</span>, vengo a demandar al Sr.{' '}
                    <span className="font-bold">{data.defendant1Name.toUpperCase() || '[DEMANDADO]'}</span>
                    {data.defendant1Address && <span>, quien tiene su domicilio en {data.defendant1Address}</span>}
                    {' '}de esta Ciudad, de quien reclamo las siguientes:
                </p>
            </div>

            {/* PRESTACIONES */}
            <div className="mb-6">
                <p className="font-bold">P R E S T A C I O N E S:</p>
            </div>

            <div className="text-justify space-y-4 mb-6">
                {/* PRESTACION A */}
                <p>
                    <span className="font-bold">A).- </span>
                    Del Sr. {data.defendant1Name.toUpperCase() || '[DEMANDADO]'}, demando que se declare por sentencia firme que me he convertido en propietario del lote de terreno No. {data.lotNumber || '[#]'} de la manzana {data.blockNumber || '[#]'} del desarrollo denominado {data.developmentName.toUpperCase() || '[DESARROLLO]'}, siendo parte de un predio mayor {data.propertyLocation || '[UBICACIÓN]'} en la delegación de {data.delegation || '[DELEGACIÓN]'} de esta Ciudad, mismo que cuenta con una superficie total de {data.propertyArea || '[SUPERFICIE]'} y las siguientes medidas y colindancias:
                </p>

                {/* Boundaries */}
                <div className="ml-8 space-y-2">
                    <p><span className="font-bold">AL NOROESTE.- </span>{data.boundaryNorthwest || '[LINDERO NOROESTE]'}</p>
                    <p><span className="font-bold">AL SUROESTE.- </span>{data.boundarySouthwest || '[LINDERO SUROESTE]'}</p>
                    <p><span className="font-bold">AL SURESTE.- </span>{data.boundarySoutheast || '[LINDERO SURESTE]'}</p>
                    <p><span className="font-bold">AL NORESTE.- </span>{data.boundaryNortheast || '[LINDERO NORESTE]'}</p>
                </div>

                {/* PRESTACION B */}
                <p>
                    <span className="font-bold">B).- </span>
                    Del Sr. {data.registeredOwner.toUpperCase() || '[PROPIETARIO REGISTRADO]'} demando la cancelación parcial de la Partida número {data.registryParty || '[PARTIDA]'} de la {data.registrySection || '[SECCIÓN]'} de fecha {data.registryDate || '[FECHA]'}, bajo la cual se inscribió el inmueble descrito en el inciso inmediato anterior favor de los demandados.
                </p>
            </div>

            {/* HECHOS Header */}
            <div className="text-justify mb-6">
                <p>Fundo la presente demanda en la siguiente relación de hechos y preceptos legales aplicables.</p>
            </div>

            <div className="mb-6">
                <p className="font-bold">H E C H O S:</p>
            </div>

            {/* HECHOS */}
            <div className="text-justify space-y-4 mb-6">
                <p>
                    <span className="font-bold">1.- </span>
                    Con fecha {data.possessionStartDate || '[FECHA]'} el suscrito promovente entré a poseer el bien inmueble materia del presente juicio y consistente en el lote de terreno No. {data.lotNumber || '[#]'} de la manzana {data.blockNumber || '[#]'} del desarrollo {data.developmentName.toUpperCase() || '[DESARROLLO]'} de esta Ciudad de {data.city || 'Tijuana, B.C.'}, de la Delegación de {data.delegation || '[DELEGACIÓN]'} de esta Ciudad, mismo que cuenta con una superficie total de {data.propertyArea || '[SUPERFICIE]'} y las medidas y colindancias ya señaladas.
                </p>

                <p>
                    <span className="font-bold">2.- </span>
                    Es preciso mencionar que el origen de mi posesión proviene de la celebración de un contrato de compraventa que llevé a cabo con su anterior propietario y posesionario el Sr. {data.previousOwner.toUpperCase() || '[PROPIETARIO ANTERIOR]'}, en esa misma fecha, es decir el {data.purchaseDate || '[FECHA]'}, tal y como se acredita fehacientemente mediante la exhibición del documento que lo contiene y que acompaño a la presente demanda como documento base de la acción, mencionando que oportunamente cubrí íntegramente el precio pactado en dicha operación compraventa.
                </p>

                <p>
                    <span className="font-bold">3.- </span>
                    Cabe señalarse que a su vez mi causante el Sr. {data.previousOwner.toUpperCase() || '[PROPIETARIO ANTERIOR]'} había adquirido del ahora demandado SR. {data.registeredOwner.toUpperCase() || '[PROPIETARIO REGISTRADO]'} el bien inmueble que nos ocupa, es decir, en dicha fecha los demandados le vendieron, cedieron y traspasaron a mi causante en mención el lote de terreno materia de este juicio, de quien recibieron oportunamente el pago del precio convenido y así mismo le entregaron al Sr. {data.plaintiffName.toUpperCase() || '[ACTOR]'} la posesión material y jurídica del citado inmueble para todos los efectos legales conducentes.
                </p>

                <p>
                    <span className="font-bold">4.- </span>
                    Al igual que mi causante, desde la fecha indicada en el punto de hechos número 1, es decir, desde el {data.possessionStartDate || '[FECHA]'}, he continuado poseyendo el citado lote de terreno que nos ocupa en forma pública, pacífica, continua, de buena fe y en concepto de propietaria.
                </p>

                <p>
                    <span className="font-bold">5.- </span>
                    Finalmente, al tratar de legalizar la posesión que ostento sobre el inmueble materia del presente juicio, a fin de obtener mi título de propiedad, se me informó en el Registro Público de la Propiedad y de Comercio, que la fracción que pretendo prescribir se encuentra inscrito a nombre del ahora demandado Sr. {data.registeredOwner.toUpperCase() || '[PROPIETARIO REGISTRADO]'} {data.propertyLocation || '[UBICACIÓN]'} de esta Ciudad, según se aprecia en la Partida cuya cancelación se reclama en el inciso B) del capítulo de prestaciones de la presente demanda, razón por la que me veo en la imperiosa necesidad de promoverles el juicio de prescripción que nos trata, acordes con el numeral 1143 del Código Civil vigente en el Estado para que mediante sentencia definitiva se me declare propietaria del mismo, en base a la posesión que ostento y a la de mi causante que aprovecho en los términos del artículo 1136 del citado cuerpo de leyes, ordenando su inscripción en los libros correspondientes de dicha oficina Registradora.
                </p>
            </div>

            {/* CAPITULO DE DERECHO */}
            <div className="mb-6">
                <p className="font-bold mb-2">CAPITULO DE DERECHO.</p>
                <div className="text-justify space-y-3">
                    <p>
                        Son aplicables en cuanto al fondo las disposiciones contenidas en los artículos 781, 782, 785, 789, 792, 793, 794, 797, 798, 799, 814, 815, 816, 817, 818, del 1122 al 1144 y demás relativos del Código Civil en vigor.
                    </p>
                    <p>
                        En cuanto al procedimiento se rige en lo dispuesto por los artículos del 256 al 262 y demás relativos del Código de Procedimientos Civiles vigente en el Estado.
                    </p>
                </div>
            </div>

            {/* PETITIONS */}
            <div className="mb-6">
                <p className="text-justify mb-2">Por lo expuesto y fundado, a Usted C. JUEZ atentamente pido se sirva:</p>
                <div className="text-justify space-y-3">
                    <p>
                        <span className="font-bold">PRIMERO.- </span>
                        Tenerme por presentada con este escrito y documentos anexos, demandado al Sr. {data.defendant1Name.toUpperCase() || '[DEMANDADO]'}, por las prestaciones ya indicadas.
                    </p>

                    <p>
                        <span className="font-bold">SEGUNDO.- </span>
                        Con las copias simples, ordenar se corra traslado al demandado, emplazándolos para que dentro del término legal manifieste lo que a su derecho convenga.
                    </p>

                    <p>
                        <span className="font-bold">TERCERO.- </span>
                        En su oportunidad, pronunciar sentencia definitiva en la que se nos declare propietarios del inmueble de referencia.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8">
                <p className="text-center font-bold mb-4">PROTESTO LO NECESARIO</p>

                <p className="text-right mb-8">
                    {data.city || 'Tijuana, B.C.'}, al día de su presentación
                </p>

                {/* Signature */}
                <div className="text-center space-y-1">
                    <p className="mb-2">_________________________________</p>
                    <p className="font-bold">{data.plaintiffName.toUpperCase() || '[NOMBRE DEL ACTOR]'}</p>
                    <p>ABOGADO PROCURADOR</p>
                </div>
            </div>
        </div>
    )
}
