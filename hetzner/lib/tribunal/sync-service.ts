/**
 * Tribunal Electrónico Sync Service
 * Orchestrates the sync process for a user's tribunal documents
 *
 * Updated 2026-01-28: Now syncs only documents for tracked expedientes
 * and stores them in unified case_files table
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationLogger } from '../notification-logger';
import { runTribunalScraper } from './scraper-runner';
import { downloadTribunalPDF } from './pdf-downloader';
import { generateDocumentSummary } from './ai-summarizer';
import { sendTribunalWhatsAppAlert } from './whatsapp-notifier';
import { normalizeExpediente } from './normalize-expediente';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface SyncUserParams {
  userId: string;
  vaultPasswordId: string;
  vaultKeyFileId: string;
  vaultCerFileId: string;
  email: string;
  retryCount: number;
  supabase: SupabaseClient;
  logger: NotificationLogger;
}

export interface SyncResult {
  success: boolean;
  newDocuments: number;
  documentsProcessed: number;
  documentsFailed: number;
  error?: string;
}

/**
 * Sync tribunal documents for a single user
 */
export async function syncTribunalForUser(
  params: SyncUserParams
): Promise<SyncResult> {
  const {
    userId,
    vaultPasswordId,
    vaultKeyFileId,
    vaultCerFileId,
    email,
    retryCount,
    supabase,
    logger
  } = params;

  let syncLogId: string | null = null;
  let browser: Browser | null = null;

  try {
    // Create sync log entry
    logger.info(`Starting sync for user ${userId}`);
    const { data: syncLog, error: syncLogError } = await supabase
      .from('tribunal_sync_log')
      .insert({
        user_id: userId,
        status: 'running',
        previous_watermark: 0
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      throw new Error(`Error al crear sync log: ${syncLogError?.message}`);
    }

    syncLogId = syncLog.id;

    // Fetch user's tracked expedientes
    logger.info('Fetching user tracked expedientes');

    const { data: monitoredCases, error: casesError } = await supabase
      .from('monitored_cases')
      .select('id, case_number, juzgado')
      .eq('user_id', userId);

    if (casesError || !monitoredCases) {
      throw new Error(`Error fetching monitored cases: ${casesError?.message}`);
    }

    // Create map: normalized expediente → case_id
    // Simplified to expediente-only matching for better compatibility
    const expedienteMap = new Map<string, string>();
    monitoredCases.forEach(case_ => {
      const normalized = normalizeExpediente(case_.case_number);
      expedienteMap.set(normalized, case_.id);
    });

    logger.info(`User tracking ${monitoredCases.length} expedientes`);

    // Retrieve credentials from Vault using RPC wrapper
    logger.info('Retrieving credentials from Vault');

    const { data: password, error: passwordError } = await supabase
      .rpc('vault_get_secret', { secret_id: vaultPasswordId });

    const { data: keyFileBase64, error: keyError } = await supabase
      .rpc('vault_get_secret', { secret_id: vaultKeyFileId });

    const { data: cerFileBase64, error: cerError } = await supabase
      .rpc('vault_get_secret', { secret_id: vaultCerFileId });

    if (passwordError || keyError || cerError) {
      throw new Error('Error al obtener credenciales del Vault');
    }

    if (!password || !keyFileBase64 || !cerFileBase64) {
      throw new Error('Credenciales incompletas en Vault');
    }

    logger.info('Credentials retrieved successfully');

    // Run scraper
    logger.info('Running scraper...');
    const scraperResult = await runTribunalScraper({
      email,
      password,
      keyFileBase64,
      cerFileBase64
    });

    if (!scraperResult.success) {
      // Implement retry mechanism (3 tries before marking as failed)
      const newRetryCount = retryCount + 1;
      const maxRetries = 3;

      if (newRetryCount >= maxRetries) {
        // Mark credentials as failed after 3 attempts
        logger.error(`User ${userId} failed after ${newRetryCount} attempts, marking as failed`);
        await supabase
          .from('tribunal_credentials')
          .update({
            status: 'failed',
            retry_count: newRetryCount,
            validation_error: scraperResult.error,
            last_validation_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        // Mark for retry
        logger.info(`User ${userId} failed (attempt ${newRetryCount}/${maxRetries}), will retry next sync`);
        await supabase
          .from('tribunal_credentials')
          .update({
            status: 'retry',
            retry_count: newRetryCount,
            validation_error: scraperResult.error,
            last_validation_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      throw new Error(`Scraper failed: ${scraperResult.error}`);
    }

    const allDocuments = scraperResult.documents;
    logger.info(`Scraper found ${allDocuments.length} total documents`);

    // Filter - Only process documents for tracked expedientes
    const relevantDocuments = allDocuments.filter(doc => {
      const normalized = normalizeExpediente(doc.expediente);
      return expedienteMap.has(normalized);
    });

    logger.info(
      `${relevantDocuments.length} documents match tracked expedientes (filtered from ${allDocuments.length})`
    );

    // Use the browser and page from the scraper (already logged in!)
    if (!scraperResult.browser || !scraperResult.page) {
      throw new Error('Scraper did not return browser/page');
    }

    browser = scraperResult.browser;
    const page = scraperResult.page;
    logger.info('Using authenticated browser session from scraper');

    let documentsProcessed = 0;
    let documentsFailed = 0;
    let newDocumentsFound = 0;

    // Process only relevant documents
    for (const doc of relevantDocuments) {
      const normalizedExpediente = normalizeExpediente(doc.expediente);
      const caseId = expedienteMap.get(normalizedExpediente);

      if (!caseId) {
        logger.warn(`No case_id found for ${doc.expediente} (should not happen)`);
        continue;
      }

      logger.info(`Processing ${doc.expediente}: ${doc.descripcion}`);

      try {
        // Parse fecha from fechaPublicacion (format: DD/MM/YYYY)
        let fecha: string | null = null;
        if (doc.fechaPublicacion) {
          const parts = doc.fechaPublicacion.split('/');
          if (parts.length === 3) {
            fecha = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
          }
        }

        // Stage 1: Check if document already exists in case_files
        // Key: case_id + tribunal_descripcion + tribunal_fecha
        const { data: existingFile } = await supabase
          .from('case_files')
          .select('id')
          .eq('case_id', caseId)
          .eq('source', 'tribunal_electronico')
          .eq('tribunal_descripcion', doc.descripcion)
          .eq('tribunal_fecha', fecha)
          .maybeSingle();

        if (existingFile) {
          logger.info(`Document already processed, skipping`);
          continue; // Already downloaded, summarized, and alerted
        }

        // Stage 2: Check if document is in baseline (historical)
        const { data: inBaseline } = await supabase
          .from('tribunal_baseline')
          .select('id')
          .eq('user_id', userId)
          .eq('expediente', normalizedExpediente)
          .eq('juzgado', doc.juzgado)
          .eq('descripcion', doc.descripcion)
          .eq('fecha', fecha)
          .maybeSingle();

        if (inBaseline) {
          logger.info(`Document in baseline (historical), skipping alert`);
          // Create stub entry in case_files to mark as seen (without download/summarize/alert)
          const dateStr = fecha ? fecha.replace(/-/g, '') : 'sin-fecha';
          const fileName = `${normalizedExpediente} - ${doc.descripcion.substring(0, 50)} - ${dateStr}.pdf`;

          await supabase
            .from('case_files')
            .insert({
              user_id: userId,
              case_id: caseId,
              file_name: fileName,
              file_path: null,  // No PDF downloaded
              file_size: 0,
              mime_type: 'application/pdf',
              source: 'tribunal_electronico',
              ai_summary: null,  // No AI summary
              tribunal_descripcion: doc.descripcion,
              tribunal_fecha: fecha
            });

          continue; // Skip download, summarize, alert
        }

        // New document found (not in case_files, not in baseline) - process it fully
        logger.info(`✨ New document found (not in baseline), processing...`);

        // NEW document found - process it
        newDocumentsFound++;
        logger.info(`✨ New document found, processing...`);

        // Download PDF and upload to storage
        logger.info(`Downloading PDF`);
        const pdfResult = await downloadTribunalPDF({
          document: doc,
          page,
          browser,
          userId,
          supabase
        });

        if (!pdfResult.success) {
          logger.error(`PDF download failed: ${pdfResult.error}`);
          documentsFailed++;
          continue;
        }

        logger.info(`✓ PDF downloaded: ${pdfResult.pdfPath}`);

        // Generate AI summary with rate limiting
        logger.info(`Generating AI summary`);
        const summaryResult = await generateDocumentSummary({
          pdfPath: pdfResult.pdfPath!,
          supabase,
          expediente: doc.expediente,
          juzgado: doc.juzgado,
          descripcion: doc.descripcion
        });

        const aiSummary = summaryResult.success ? summaryResult.summary : null;

        if (summaryResult.success) {
          logger.info(`✓ AI summary generated`);
        } else {
          logger.warn(`⚠ AI summary failed: ${summaryResult.error}`);
        }

        // Rate limiting: 2 second delay before next AI call
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate filename
        const dateStr = fecha ? fecha.replace(/-/g, '') : 'sin-fecha';
        const fileName = `${normalizedExpediente} - ${doc.descripcion.substring(0, 50)} - ${dateStr}.pdf`;

        // Insert into case_files (unified table)
        const { data: caseFile, error: fileError } = await supabase
          .from('case_files')
          .insert({
            user_id: userId,
            case_id: caseId,
            file_name: fileName,
            file_path: pdfResult.pdfPath,
            file_size: pdfResult.sizeBytes,
            mime_type: 'application/pdf',
            source: 'tribunal_electronico',
            ai_summary: aiSummary,
            tribunal_descripcion: doc.descripcion,
            tribunal_fecha: fecha
          })
          .select()
          .single();

        if (fileError) {
          // Check if unique constraint violation (race condition)
          if (fileError.code === '23505') {
            logger.info(`Document already exists (race condition), skipping`);
            continue;
          }
          logger.error(`Failed to create case_file: ${fileError.message}`);
          documentsFailed++;
          continue;
        }

        logger.info(`✓ Case file created: ${caseFile.id}`);

        // Create alert for Tribunal Electrónico document
        logger.info(`Creating alert for Tribunal Electrónico document`);

        const { data: newAlert, error: alertError } = await supabase
          .from('alerts')
          .insert({
            user_id: userId,
            monitored_case_id: caseId,
            case_file_id: caseFile.id,
            matched_on: 'case_number',
            matched_value: normalizedExpediente
          })
          .select()
          .single();

        if (alertError || !newAlert) {
          logger.error(`Failed to create alert: ${alertError?.message}`);
          // Don't fail the whole process if alert creation fails
        } else {
          logger.info(`✓ Alert created for Tribunal document`, newAlert.id);
        }

        // Send WhatsApp notification
        const alertId = newAlert?.id;
        logger.info(`Sending WhatsApp alert...`, alertId);
        const notifyResult = await sendTribunalWhatsAppAlert({
          userId,
          expediente: doc.expediente,
          juzgado: doc.juzgado,
          descripcion: doc.descripcion,
          fecha: fecha || new Date().toISOString().split('T')[0],
          aiSummary: aiSummary || undefined,
          supabase
        });

        if (notifyResult.success) {
          logger.info(`✓ WhatsApp alert sent`, alertId);
        } else {
          logger.warn(`⚠ WhatsApp alert failed: ${notifyResult.error}`, alertId);
        }

        documentsProcessed++;
        logger.info(`✅ Document processed successfully`, alertId);

      } catch (error) {
        documentsFailed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to process document ${doc.expediente}: ${errorMsg}`);
        // Continue with next document
      }
    }

    // Update credentials status and reset retry count on success
    logger.info(`Sync completed: ${newDocumentsFound} new, ${documentsProcessed} processed, ${documentsFailed} failed`);
    await supabase
      .from('tribunal_credentials')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'active',
        retry_count: 0,
        validation_error: null,
        last_validation_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Update sync log
    await supabase
      .from('tribunal_sync_log')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        new_documents_found: newDocumentsFound,
        documents_processed: documentsProcessed,
        documents_failed: documentsFailed,
        new_watermark: 0
      })
      .eq('id', syncLogId);

    logger.info(`Sync completed successfully`);

    return {
      success: true,
      newDocuments: newDocumentsFound,
      documentsProcessed,
      documentsFailed
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Sync failed for user ${userId}: ${errorMsg}`);

    // Update sync log as failed
    if (syncLogId) {
      await supabase
        .from('tribunal_sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMsg
        })
        .eq('id', syncLogId);
    }

    return {
      success: false,
      newDocuments: 0,
      documentsProcessed: 0,
      documentsFailed: 0,
      error: errorMsg
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
