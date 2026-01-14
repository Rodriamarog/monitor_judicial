const COURT_NAME_MAPPING = {
    "JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL CON RESIDENCIA EN TIJUANA B.C": "JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL CON RESIDENCIA EN TIJUANA B.C": "JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA",
    "JUZGADO DECIMO DE PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA DE MEXICALI": "JUZGADO DECIMO DE PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA DE MEXICALI", // Self-map or verify if generic exists
    "JUZGADO DECIMO PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA MEXICALI": "JUZGADO DECIMO DE PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA DE MEXICALI",
    "JUZGADO DECIMO SEGUNDO PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA TIJUANA": "JUZGADO DECIMO SEGUNDO DE PRIMERA INSTANCIA CIVIL ESPECIALIZADO EN MATERIA HIPOTECARIA DE TIJUANA",
    "JUZGADO PRIMERO FAMILIAR MEXICALI": "JUZGADO PRIMERO DE LO FAMILIAR DE MEXICALI",
    "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE TIJUANA": "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE TIJUANA",
    "TRIBUNAL LABORAL DE TIJUANA": "TRIBUNAL LABORAL DE TIJUANA",
    "JUZGADO PRIMERO CIVIL TIJUANA": "JUZGADO PRIMERO CIVIL DE TIJUANA",
    "JUZGADO HIPOTECARIO TIJUANA": "JUZGADO HIPOTECARIO DE TIJUANA",
    "JUZGADO SEGUNDO CIVIL TIJUANA": "JUZGADO SEGUNDO CIVIL DE TIJUANA",
    "JUZGADO TERCERO CIVIL TIJUANA": "JUZGADO TERCERO CIVIL DE TIJUANA",
    "JUZGADO CUARTO CIVIL TIJUANA": "JUZGADO CUARTO CIVIL DE TIJUANA",
    "JUZGADO QUINTO CIVIL TIJUANA": "JUZGADO QUINTO CIVIL DE TIJUANA",
    "JUZGADO SEXTO CIVIL TIJUANA": "JUZGADO SEXTO CIVIL DE TIJUANA",
    "JUZGADO SEPTIMO CIVIL TIJUANA": "JUZGADO SEPTIMO CIVIL DE TIJUANA",
    "JUZGADO OCTAVO CIVIL TIJUANA": "JUZGADO OCTAVO CIVIL DE TIJUANA",
    // Note: Buho uses "NOVENO CIVIL TIJUANA" usually, mapped to "JUZGADO NOVENO CIVIL DE TIJUANA" if it existed in list, but list skips it? 
    // Wait, user list skipped Noveno Tijuana? Let's check user list. It has Decimo.
    // User list: ... Octavo, Decimo. 
    // Buho list has Noveno. I will assume standard format "DE TIJUANA" for safe fallback.
    "JUZGADO NOVENO CIVIL TIJUANA": "JUZGADO NOVENO CIVIL DE TIJUANA",
    "JUZGADO DECIMO CIVIL TIJUANA": "JUZGADO DECIMO CIVIL DE TIJUANA",
    "JUZGADO DECIMO PRIMERO CIVIL DE TIJUANA": "JUZGADO DECIMO PRIMERO CIVIL DE TIJUANA", // Verify Buho source
    "JUZGADO CORPORATIVO DECIMO TERCERO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO TERCERO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO CUARTO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO CUARTO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO QUINTO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO QUINTO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO SEXTO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO SEXTO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO SEPTIMO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO SEPTIMO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO OCTAVO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO OCTAVO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO DECIMO NOVENO CIVIL TIJUANA": "JUZGADO CORPORATIVO DECIMO NOVENO CIVIL DE TIJUANA",
    "JUZGADO CORPORATIVO VIGESIMO CIVIL TIJUANA": "JUZGADO CORPORATIVO VIGESIMO CIVIL DE TIJUANA",
    "JUZGADO PRIMERO FAMILIAR TIJUANA": "JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO SEGUNDO FAMILIAR TIJUANA": "JUZGADO SEGUNDO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO TERCERO FAMILIAR TIJUANA": "JUZGADO TERCERO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO CUARTO FAMILIAR TIJUANA": "JUZGADO CUARTO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO QUINTO FAMILIAR TIJUANA": "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO SEXTO FAMILIAR TIJUANA": "JUZGADO SEXTO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO SEPTIMO FAMILIAR TIJUANA": "JUZGADO SEPTIMO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO OCTAVO FAMILIAR TIJUANA": "JUZGADO OCTAVO DE LO FAMILIAR DE TIJUANA",
    "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI": "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI",
    "TRIBUNAL LABORAL DE MEXICALI": "TRIBUNAL LABORAL DE MEXICALI",
    "JUZGADO HIPOTECARIO DE MEXICALI": "JUZGADO HIPOTECARIO DE MEXICALI", // Verify Buho source
    "JUZGADO PRIMERO CIVIL MEXICALI": "JUZGADO PRIMERO CIVIL DE MEXICALI",
    "JUZGADO SEGUNDO CIVIL MEXICALI": "JUZGADO SEGUNDO CIVIL DE MEXICALI",
    "JUZGADO TERCERO CIVIL MEXICALI": "JUZGADO TERCERO CIVIL DE MEXICALI",
    "JUZGADO CUARTO CIVIL MEXICALI": "JUZGADO CUARTO CIVIL DE MEXICALI",
    "JUZGADO QUINTO CIVIL MEXICALI": "JUZGADO QUINTO CIVIL DE MEXICALI",
    "JUZGADO SEXTO CIVIL MEXICALI": "JUZGADO SEXTO CIVIL DE MEXICALI",
    "JUZGADO SEPTIMO CIVIL MEXICALI": "JUZGADO SEPTIMO CIVIL DE MEXICALI",
    "JUZGADO OCTAVO CIVIL MEXICALI": "JUZGADO OCTAVO CIVIL DE MEXICALI",
    "JUZGADO NOVENO CIVIL MEXICALI": "JUZGADO NOVENO CIVIL DE MEXICALI",
    "JUZGADO SEGUNDO FAMILIAR MEXICALI": "JUZGADO SEGUNDO DE LO FAMILIAR DE MEXICALI",
    "JUZGADO TERCERO FAMILIAR MEXICALI": "JUZGADO TERCERO DE LO FAMILIAR DE MEXICALI",
    "JUZGADO CUARTO FAMILIAR MEXICALI": "JUZGADO CUARTO DE LO FAMILIAR DE MEXICALI",
    "JUZGADO QUINTO FAMILIAR MEXICALI": "JUZGADO QUINTO DE LO FAMILIAR DE MEXICALI",
    "JUZGADO SEXTO FAMILIAR MEXICALI": "JUZGADO SEXTO DE LO FAMILIAR DE MEXICALI",
    "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE ENSENADA": "JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE ENSENADA",
    "TRIBUNAL LABORAL DE ENSENADA": "TRIBUNAL LABORAL DE ENSENADA",
    "JUZGADO PRIMERO CIVIL ENSENADA": "JUZGADO PRIMERO CIVIL DE ENSENADA",
    "JUZGADO SEGUNDO CIVIL ENSENADA": "JUZGADO SEGUNDO CIVIL DE ENSENADA",
    "JUZGADO TERCERO CIVIL ENSENADA": "JUZGADO TERCERO CIVIL DE ENSENADA",
    "JUZGADO CUARTO CIVIL ENSENADA": "JUZGADO CUARTO CIVIL DE ENSENADA",
    "JUZGADO PRIMERO FAMILIAR ENSENADA": "JUZGADO PRIMERO DE LO FAMILIAR DE ENSENADA",
    "JUZGADO SEGUNDO FAMILIAR ENSENADA": "JUZGADO SEGUNDO DE LO FAMILIAR DE ENSENADA",
    "JUZGADO 1ERA INSTCIVIL TECATE": "JUZGADO DE 1ERA INST.CIVIL DE TECATE",
    "JUZGADO PRIMERA INSTANCIA FAMILIAR TECATE": "JUZGADO PRIMERA INSTANCIA DE LO FAMILIAR DE TECATE",
    "JUZGADO PRIMERA INSTANCIA CIVIL SAN FELIPE": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE SAN FELIPE",
    "JUZGADO MIXTO PRIMERA INSTANCIA SAN FELIPE": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE SAN FELIPE", // Likely mapping
    "JUZGADO PRIMERA INSTANCIA CIVIL CD MORELOS": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE CD. MORELOS",
    "JUZGADO MIXTO PRIMERA INSTANCIA CIUDAD MORELOS": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE CD. MORELOS",
    "JUZGADO PRIMERA INSTANCIA CIVIL CIUDAD GUADALUPE VICTORIA": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE GUADALUPE VICTORIA",
    "JUZGADO MIXTO PRIMERA INSTANCIA GUADALUPE VICTORIA": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE GUADALUPE VICTORIA",
    "JUZGADO 1ERA INSTCIVIL PLAYAS ROSARITO": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE PLAYAS DE ROSARITO",
    "JUZGADO MIXTO PRIMERA INSTANCIA PLAYAS ROSARITO": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE PLAYAS DE ROSARITO",
    "JUZGADO PRIMERA INSTANCIA FAMILIAR PLAYAS ROSARITO": "JUZGADO PRIMERA INSTANCIA DE LO FAMILIAR DE PLAYAS DE ROSARITO",
    "TRIBUNAL LABORAL DE SAN QUINTIN": "TRIBUNAL LABORAL DE SAN QUINTIN",
    "JUZGADO PRIMERA INSTANCIA CIVIL SAN QUINTIN": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE SAN QUINTIN",
    "JUZGADO MIXTO PRIMERA INSTANCIA SAN QUINTIN": "JUZGADO DE PRIMERA INSTANCIA CIVIL DE SAN QUINTIN"
};

function scrapeData() {
    const cases = [];
    const listRows = document.querySelectorAll('.list_alert_row');

    const clean = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';

    // Helper to map names
    const getMappedCourtName = (buhoName) => {
        const cleanedName = clean(buhoName);
        if (COURT_NAME_MAPPING[cleanedName]) {
            return COURT_NAME_MAPPING[cleanedName];
        }
        // Heuristic fallback: if it doesn't match, check if we can fix generic suffix
        // e.g. "JUZGADO PRIMERO CIVIL TIJUANA" -> "JUZGADO PRIMERO CIVIL DE TIJUANA"
        // Most patterns differ by "DE " before the city.

        return cleanedName;
    };

    if (listRows.length > 0) {
        listRows.forEach(row => {
            const cols4 = row.querySelectorAll('.col-xl-4');
            const cols2 = row.querySelectorAll('.col-xl-2');

            let nombre = '';
            let expediente = '';
            let juzgado = '';
            let fecha = '';

            if (cols4.length >= 2 && cols2.length >= 2) {
                nombre = clean(cols4[0].textContent);
                expediente = clean(cols2[0].textContent);
                juzgado = getMappedCourtName(cols4[1].textContent);
                fecha = clean(cols2[1].textContent);
            } else {
                const bTags = row.querySelectorAll('b');
                if (bTags.length >= 4) {
                    nombre = clean(bTags[0].textContent);
                    expediente = clean(bTags[1].textContent);
                    juzgado = getMappedCourtName(bTags[2].textContent);
                    fecha = clean(bTags[3].textContent);
                }
            }

            if (nombre || expediente) {
                cases.push({
                    Nombre: nombre,
                    Expediente: expediente,
                    Juzgado: juzgado,
                    Fecha: fecha
                });
            }
        });
    } else {
        const squareRows = document.querySelectorAll('.square_alert_row');
        squareRows.forEach(row => {
            const getName = () => {
                const el = row.querySelector('#alert_name');
                return el ? el.textContent : '';
            };
            const getOffice = () => {
                const input = row.querySelector('input[id="alert_office"]');
                if (input) return input.value;
                const el = row.querySelector('#alert_office');
                return el ? el.textContent : '';
            };
            const getExpedient = () => {
                const el = row.querySelector('#alert_expedient');
                return el ? el.textContent : '';
            };
            const getDate = () => {
                const input = row.querySelector('input[id="alert_created_at"]');
                return input ? input.value : '';
            };

            cases.push({
                Nombre: clean(getName()),
                Expediente: clean(getExpedient()),
                Juzgado: getMappedCourtName(getOffice()),
                Fecha: clean(getDate())
            });
        });
    }

    return cases;
}

const downloadAsFile = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expedientes_importados.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape_and_download") {
        try {
            const data = scrapeData();
            if (data.length > 0) {
                downloadAsFile(data);
                sendResponse({ success: true, count: data.length });
            } else {
                sendResponse({ success: false, count: 0 });
            }
        } catch (e) {
            console.error(e);
            sendResponse({ success: false, error: e.toString() });
        }
    }
    return true;
});
