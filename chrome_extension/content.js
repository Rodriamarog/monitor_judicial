function scrapeData() {
    const cases = [];

    // Try to find list rows first
    const listRows = document.querySelectorAll('.list_alert_row');

    if (listRows.length > 0) {
        listRows.forEach(row => {
            // The structure inside list_alert_row is nested. 
            // We look for the main content container which is usually the sibling of the icon container
            // Based on snippet: col-xl-12 col-lg-12 col-md-11 ...

            // Let's try to query the columns directly within the row
            // Valid columns expected: Name (col-xl-4), Expedient (col-xl-2), Office (col-xl-4), Date (col-xl-2)

            // Helpers to clean text
            const clean = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';

            // We can scope selectors to the row
            const cols4 = row.querySelectorAll('.col-xl-4');
            const cols2 = row.querySelectorAll('.col-xl-2');

            // This relies on the exact bootstrap class count. 
            // List view snippet has:
            // Name: col-xl-4
            // Expedient: col-xl-2
            // Office: col-xl-4
            // Date: col-xl-2

            let nombre = '';
            let expediente = '';
            let juzgado = '';
            let fecha = '';

            if (cols4.length >= 2 && cols2.length >= 2) {
                nombre = clean(cols4[0].textContent);
                expediente = clean(cols2[0].textContent); // The snippet shows expediente in col-xl-2
                juzgado = clean(cols4[1].textContent);
                fecha = clean(cols2[1].textContent);
            } else {
                // Fallback: simple tag based?
                // "Nombre" usually has bold text.
                // But let's look at the implementation using 'b' tags sequence if classes fail
                const bTags = row.querySelectorAll('b');
                // Usually: [0] = Name, [1] = Expedient, [2] = Office, [3] = Date
                if (bTags.length >= 4) {
                    nombre = clean(bTags[0].textContent);
                    expediente = clean(bTags[1].textContent);
                    juzgado = clean(bTags[2].textContent);
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
        // Attempt square view if list view is not present
        const squareRows = document.querySelectorAll('.square_alert_row');
        squareRows.forEach(row => {
            const clean = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';

            // Square view has helper inputs or ids (though IDs might be duplicated in invalid HTML, we handle it)
            // IDs: alert_name, alert_office, alert_expedient, alert_created_at (hidden input)
            // Note: QuerySelector on an element ONLY finds descendants, so duplicate IDs on page don't break it if scoped, 
            // BUT getElementById does. standard querySelector uses CSS selectors.

            // For duplicate IDs, querySelectorAll()[0] is safer.
            const getName = () => {
                const el = row.querySelector('#alert_name');
                return el ? el.textContent : '';
            };
            const getOffice = () => {
                // Try hidden input first for full text
                const input = row.querySelector('input[id="alert_office"]');
                if (input) return input.value;
                const el = row.querySelector('#alert_office'); // b tag
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
                Juzgado: clean(getOffice()),
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
