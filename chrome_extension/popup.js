document.getElementById('scrapeBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Buscando expedientes...';

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
        statusDiv.textContent = 'Error: No se encontró la pestaña activa.';
        return;
    }

    try {
        // Send command to content script to scrape AND download
        chrome.tabs.sendMessage(tab.id, { action: "scrape_and_download" }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Ingresa a una pagina con expedientes del boletin judicial antes de presionar el boton';
                console.error(chrome.runtime.lastError);
                return;
            }

            if (response && response.success) {
                statusDiv.textContent = `¡Éxito! Se descargaron ${response.count} expedientes.`;
            } else if (response && !response.success) {
                if (response.count === 0) {
                    statusDiv.textContent = 'No se encontraron expedientes.';
                } else if (response.error) {
                    statusDiv.textContent = 'Error interno: ' + response.error;
                } else {
                    statusDiv.textContent = 'Fallo desconocido.';
                }
            }
        });
    } catch (e) {
        statusDiv.textContent = 'Error crítico: ' + e.message;
    }
});
