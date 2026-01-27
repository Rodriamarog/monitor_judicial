/**
 * Credential Validation with Progress
 * Combines login validation + document scraping to establish baseline
 */

const { runTribunalScraper } = require('./tribunal/scraper-runner');

/**
 * Validate credentials and establish document baseline
 *
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.password - User password
 * @param {string} params.keyFileBase64 - Base64 encoded .key file
 * @param {string} params.cerFileBase64 - Base64 encoded .cer file
 * @param {Function} params.onProgress - Progress callback function
 * @returns {Promise<Object>} Validation result with lastDocumentDate
 */
// Helper to add delay between progress steps
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function validateCredentialsWithProgress(params) {
  const { email, password, keyFileBase64, cerFileBase64, onProgress } = params;

  let scraperResult = null;

  try {
    onProgress('Iniciando navegador...');
    await delay(1200);

    onProgress('Validando credenciales...');
    await delay(1200);

    onProgress('Ingresando a la cuenta...');
    await delay(1200);

    onProgress('Navegando a Tribunal Electrónico...');
    await delay(1200);

    onProgress('Verificando conexión...');

    // Run the scraper with incremental progress updates
    // This is the long-running part, so we'll update progress periodically
    let progressInterval;
    let currentStep = 0;
    const steps = [
      'Verificando conexión...',
      'Cargando información...',
      'Procesando datos...'
    ];

    const scraperPromise = runTribunalScraper({
      email,
      password,
      keyFileBase64,
      cerFileBase64
    });

    // Send progress updates every 5 seconds during scraping
    // Stop at the last step instead of cycling back
    progressInterval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        onProgress(steps[currentStep]);
      }
      // Stay at "Procesando datos..." (75%) until scraping completes
    }, 5000);

    scraperResult = await scraperPromise;
    clearInterval(progressInterval);

    if (!scraperResult.success) {
      onProgress('✗ Error de validación');
      return {
        success: false,
        error: scraperResult.error || 'Error al validar credenciales'
      };
    }

    onProgress('Analizando documentos actuales...');

    // Find the most recent document date
    const documents = scraperResult.documents;
    let latestDate = null;

    if (documents.length > 0) {
      // Parse dates and find the latest
      const dates = documents
        .map(doc => {
          if (!doc.fechaPublicacion) return null;

          // Parse DD/MM/YYYY format
          const parts = doc.fechaPublicacion.split('/');
          if (parts.length === 3) {
            // Create date: YYYY-MM-DD
            const year = parts[2];
            const month = parts[1];
            const day = parts[0];
            return new Date(`${year}-${month}-${day}`);
          }
          return null;
        })
        .filter(d => d !== null && !isNaN(d.getTime()));

      if (dates.length > 0) {
        latestDate = new Date(Math.max(...dates));
      }
    }

    // Format as YYYY-MM-DD for PostgreSQL DATE type
    const latestDateStr = latestDate
      ? latestDate.toISOString().split('T')[0]
      : null;

    if (latestDateStr) {
      onProgress(`Estableciendo fecha base: ${latestDateStr}`);
    } else {
      onProgress('Sin documentos encontrados');
    }

    onProgress(`✓ Validación exitosa (${documents.length} documentos encontrados)`);

    return {
      success: true,
      documentCount: documents.length,
      lastDocumentDate: latestDateStr
    };

  } catch (error) {
    console.error('[Validation] Error:', error);
    onProgress(`✗ Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Error desconocido durante la validación'
    };
  }
}

module.exports = { validateCredentialsWithProgress };
