/**
 * Tribunal Electrónico Sync Service
 * Orchestrates the sync process for a user's tribunal documents
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationLogger } from '../notification-logger';
import { runTribunalScraper } from './scraper-runner';
import { downloadTribunalPDF } from './pdf-downloader';
import { generateDocumentSummary } from './ai-summarizer';
import { sendTribunalWhatsAppAlert } from './whatsapp-notifier';
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
  lastDocumentDate: string | null;
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
    lastDocumentDate,
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
        previous_watermark: lastDocumentDate ? new Date(lastDocumentDate).getTime() : 0
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      throw new Error(`Error al crear sync log: ${syncLogError?.message}`);
    }

    syncLogId = syncLog.id;

    // Retrieve credentials from Vault using RPC wrapper
    logger.info('Retrieving credentials from Vault', syncLogId);

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

    logger.info('Credentials retrieved successfully', syncLogId);

    // Run scraper
    logger.info('Running scraper...', syncLogId);
    const scraperResult = await runTribunalScraper({
      email,
      password,
      keyFileBase64,
      cerFileBase64
    });

    if (!scraperResult.success) {
      // Mark credentials as failed
      await supabase
        .from('tribunal_credentials')
        .update({
          status: 'failed',
          validation_error: scraperResult.error,
          last_validation_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      throw new Error(`Scraper failed: ${scraperResult.error}`);
    }

    const allDocuments = scraperResult.documents;
    logger.info(`Scraper found ${allDocuments.length} total documents`, syncLogId);

    // Helper function to parse DD/MM/YYYY to Date
    const parseDocumentDate = (fechaPublicacion: string | undefined): Date | null => {
      if (!fechaPublicacion) return null;
      const parts = fechaPublicacion.split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts;
      const date = new Date(`${year}-${month}-${day}`);
      return isNaN(date.getTime()) ? null : date;
    };

    // Filter new documents (fecha > lastDocumentDate)
    const newDocuments = allDocuments.filter(doc => {
      if (!lastDocumentDate) return true; // If no baseline, all are new
      const docDate = parseDocumentDate(doc.fechaPublicacion);
      if (!docDate) return false;
      const lastDate = new Date(lastDocumentDate);
      return docDate > lastDate;
    });
    logger.info(`Found ${newDocuments.length} new documents (last date: ${lastDocumentDate || 'none'})`, syncLogId);

    // Calculate new watermark (most recent date)
    let newWatermark = lastDocumentDate;
    if (allDocuments.length > 0) {
      const dates = allDocuments
        .map(doc => parseDocumentDate(doc.fechaPublicacion))
        .filter((d): d is Date => d !== null);

      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        newWatermark = maxDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }

    // If this is the first sync (no lastDocumentDate), just set watermark and don't process
    if (!lastDocumentDate) {
      logger.info(`First sync - setting watermark to ${newWatermark}, not processing documents`, syncLogId);

      await supabase
        .from('tribunal_credentials')
        .update({
          last_document_date: newWatermark,
          last_sync_at: new Date().toISOString(),
          status: 'active',
          validation_error: null,
          last_validation_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      await supabase
        .from('tribunal_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          new_documents_found: newDocuments.length,
          documents_processed: 0,
          documents_failed: 0,
          new_watermark: newWatermark ? new Date(newWatermark).getTime() : 0
        })
        .eq('id', syncLogId);

      logger.info('First sync completed', syncLogId);

      return {
        success: true,
        newDocuments: newDocuments.length,
        documentsProcessed: 0,
        documentsFailed: 0
      };
    }

    // Launch browser for PDF downloads (reuse same session)
    logger.info('Launching browser for PDF downloads...', syncLogId);
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    // Login to get session for PDF downloads
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // (We'll reuse the login logic from scraper, or assume we can navigate directly)
    // For simplicity, we'll just navigate to the documents page
    // The scraper already logged in, but we need a fresh page session
    // TODO: Consider refactoring to share the browser session from scraper

    let documentsProcessed = 0;
    let documentsFailed = 0;

    // Process each new document
    for (const doc of newDocuments) {
      logger.info(`Processing document ${doc.numero}: ${doc.expediente}`, syncLogId);

      try {
        // Parse fecha from fechaPublicacion (format: DD/MM/YYYY)
        let fecha: string | null = null;
        if (doc.fechaPublicacion) {
          const parts = doc.fechaPublicacion.split('/');
          if (parts.length === 3) {
            fecha = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
          }
        }

        // Insert document record first (without PDF/summary)
        const { data: insertedDoc, error: insertError } = await supabase
          .from('tribunal_documents')
          .insert({
            user_id: userId,
            numero: doc.numero,
            expediente: doc.expediente,
            juzgado: doc.juzgado,
            descripcion: doc.descripcion,
            fecha: fecha
          })
          .select()
          .single();

        if (insertError) {
          // Check if duplicate (unique constraint)
          if (insertError.code === '23505') {
            logger.warn(`Document ${doc.numero} already exists, skipping`, syncLogId);
            continue;
          }
          throw insertError;
        }

        const documentId = insertedDoc.id;
        logger.info(`Inserted document record ${documentId}`, syncLogId);

        // Note: PDF download requires navigating to the documents page with the browser
        // Since we're running scraper separately, we can't reuse the page easily
        // For now, we'll skip PDF download and just send notification
        // TODO: Refactor to share browser session or run PDF download in scraper

        // Instead, let's try a simpler approach: Generate AI summary from descripcion text
        // and send notification without PDF for now

        // Send WhatsApp notification
        logger.info(`Sending WhatsApp notification for doc ${documentId}`, syncLogId);
        const notifyResult = await sendTribunalWhatsAppAlert({
          userId,
          documentId,
          expediente: doc.expediente,
          juzgado: doc.juzgado,
          descripcion: doc.descripcion,
          fecha: fecha || new Date().toISOString().split('T')[0],
          supabase
        });

        // Update document with notification status
        await supabase
          .from('tribunal_documents')
          .update({
            whatsapp_sent: notifyResult.success,
            whatsapp_sent_at: notifyResult.success ? new Date().toISOString() : null,
            whatsapp_status: notifyResult.status,
            whatsapp_error: notifyResult.error
          })
          .eq('id', documentId);

        if (notifyResult.success) {
          logger.info(`✓ WhatsApp sent for doc ${documentId}`, syncLogId);
        } else {
          logger.warn(`WhatsApp failed for doc ${documentId}: ${notifyResult.error}`, syncLogId);
        }

        documentsProcessed++;
        logger.info(`✓ Document ${doc.numero} processed successfully`, syncLogId);

      } catch (error) {
        documentsFailed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to process document ${doc.numero}: ${errorMsg}`, syncLogId);
        // Continue with next document
      }
    }

    // Update watermark
    logger.info(`Updating watermark to ${newWatermark}`, syncLogId);
    await supabase
      .from('tribunal_credentials')
      .update({
        last_document_date: newWatermark,
        last_sync_at: new Date().toISOString(),
        status: 'active',
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
        new_documents_found: newDocuments.length,
        documents_processed: documentsProcessed,
        documents_failed: documentsFailed,
        new_watermark: newWatermark ? new Date(newWatermark).getTime() : 0
      })
      .eq('id', syncLogId);

    logger.info(`Sync completed: ${documentsProcessed} processed, ${documentsFailed} failed`, syncLogId);

    return {
      success: true,
      newDocuments: newDocuments.length,
      documentsProcessed,
      documentsFailed
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Sync failed for user ${userId}: ${errorMsg}`, syncLogId || undefined);

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
