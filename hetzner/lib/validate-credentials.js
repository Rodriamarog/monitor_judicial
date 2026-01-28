/**
 * Credential Validation with Progress
 * Combines login validation + document scraping to establish baseline
 */

const { runTribunalScraper } = require('./tribunal/scraper-runner');
const { normalizeExpediente } = require('./tribunal/normalize-expediente');

/**
 * Validate credentials and establish document baseline
 *
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.password - User password
 * @param {string} params.keyFileBase64 - Base64 encoded .key file
 * @param {string} params.cerFileBase64 - Base64 encoded .cer file
 * @param {Function} params.onProgress - Progress callback function
 * @param {string} params.userId - User ID for baseline creation (optional)
 * @param {Object} params.supabase - Supabase client for baseline storage (optional)
 * @returns {Promise<Object>} Validation result with baselineCreated flag
 */
// Helper to add delay between progress steps
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function validateCredentialsWithProgress(params) {
  const { email, password, keyFileBase64, cerFileBase64, onProgress, userId, supabase } = params;

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

    onProgress('Verificando acceso...');

    const documents = scraperResult.documents;

    // **NEW: Store baseline**
    let baselineCreated = false;
    if (userId && supabase) {
      onProgress('Estableciendo baseline de documentos...');

      try {
        // Prepare baseline records
        const baselineRecords = documents.map(doc => {
          // Parse fecha from DD/MM/YYYY to YYYY-MM-DD
          let fecha = null;
          if (doc.fechaPublicacion) {
            const parts = doc.fechaPublicacion.split('/');
            if (parts.length === 3) {
              fecha = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
            }
          }

          return {
            user_id: userId,
            expediente: normalizeExpediente(doc.expediente),
            juzgado: doc.juzgado,
            descripcion: doc.descripcion,
            fecha: fecha
          };
        });

        // Delete old baseline for this user (fresh start)
        const { error: deleteError } = await supabase
          .from('tribunal_baseline')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('[Validation] Failed to delete old baseline:', deleteError);
        }

        // Insert new baseline (batch insert)
        if (baselineRecords.length > 0) {
          const { error: baselineError } = await supabase
            .from('tribunal_baseline')
            .insert(baselineRecords);

          if (baselineError) {
            console.error('[Validation] Failed to create baseline:', baselineError);
            // Don't fail validation if baseline fails - it's optional
          } else {
            console.log(`[Validation] Baseline created: ${baselineRecords.length} documents`);
            baselineCreated = true;
          }
        }
      } catch (error) {
        console.error('[Validation] Baseline error:', error);
        // Don't fail validation
      }
    }

    onProgress(`✓ Validación exitosa (${documents.length} documentos encontrados)`);

    return {
      success: true,
      documentCount: documents.length,
      baselineCreated
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
