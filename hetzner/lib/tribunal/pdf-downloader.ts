/**
 * Tribunal PDF Downloader
 * Downloads PDFs from Tribunal Electrónico and stores them in Supabase Storage
 */

import { Browser, Page } from 'puppeteer';
import { Document } from '../../tribunal_electronico/src/scraper';
import { SupabaseClient } from '@supabase/supabase-js';

export interface DownloadPDFParams {
  document: Document;
  page: Page;
  browser: Browser;
  userId: string;
  supabase: SupabaseClient;
}

export interface DownloadPDFResult {
  success: boolean;
  pdfPath?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Sanitize filename for storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\s\-\_\.]/gi, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

/**
 * Download a single PDF document and store in Supabase Storage
 */
export async function downloadTribunalPDF(
  params: DownloadPDFParams
): Promise<DownloadPDFResult> {
  const { document: doc, page, browser, userId, supabase } = params;

  try {
    // Extract parameters from document
    const downloadParams = await extractDownloadParams(page, doc);
    if (!downloadParams) {
      return {
        success: false,
        error: 'No se pudieron extraer los parámetros de descarga'
      };
    }

    // Get process_id via AJAX calls
    const processId = await getProcessId(page, downloadParams);
    if (!processId) {
      return {
        success: false,
        error: 'No se pudo obtener el process_id del documento'
      };
    }

    console.log(`[PDF Download] Got process_id: ${processId} for doc ${doc.numero}`);

    // Fetch PDF using process_id
    const pdfBuffer = await fetchPDF(page, processId);
    if (!pdfBuffer || pdfBuffer.length < 1000) {
      return {
        success: false,
        error: 'PDF descargado es inválido o demasiado pequeño'
      };
    }

    // Generate storage path: userId/tribunal/YYYY-MM-DD/expediente_timestamp.pdf
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = Date.now();
    const expediente = doc.expediente.replace('EXPEDIENTE ', '').replace(/\//g, '_');
    const filename = sanitizeFilename(`${expediente}_${timestamp}.pdf`);
    const storagePath = `${userId}/tribunal/${dateStr}/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tribunal-documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error(`[PDF Download] Upload error:`, uploadError);
      return {
        success: false,
        error: `Error al subir PDF: ${uploadError.message}`
      };
    }

    console.log(`[PDF Download] ✓ Uploaded PDF to ${storagePath} (${Math.round(pdfBuffer.length / 1024)}KB)`);

    return {
      success: true,
      pdfPath: storagePath,
      sizeBytes: pdfBuffer.length
    };

  } catch (error) {
    console.error(`[PDF Download] Error downloading PDF for doc ${doc.numero}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Extract download parameters from the document's button/link
 */
async function extractDownloadParams(page: Page, doc: Document): Promise<any | null> {
  return await page.evaluate((targetExpediente, targetDescripcion) => {
    const elements = Array.from(
      document.querySelectorAll('button[onclick*="VerArchivoNotificacion"], a[onclick*="VerArchivoNotificacion"]')
    );

    let matchedElement: HTMLElement | null = null;

    for (const element of elements) {
      const onclick = (element as HTMLElement).getAttribute('onclick') || '';
      if (onclick.includes(targetDescripcion)) {
        matchedElement = element as HTMLElement;
        break;
      }
    }

    if (!matchedElement) {
      return null;
    }

    const onclick = matchedElement.getAttribute('onclick');
    if (!onclick) return null;

    // Parse VerArchivoNotificacion(tipoJuzgadoId, partidoJudicialId, Id, documentoId, processId, nameDocument, Index)
    const match = onclick.match(/VerArchivoNotificacion\((\d+),(\d+),(\d+),(\d+),(\d+),'([^']+)',(-?\d+)\)/);
    if (!match) {
      return null;
    }

    return {
      tipoJuzgadoId: match[1],
      partidoJudicialId: match[2],
      Id: match[3],
      documentoId: match[4],
      processId: match[5],
      nameDocument: match[6],
      Index: match[7],
      profesionistaId: (document.getElementById('pProfesionistaId') as HTMLInputElement)?.value || ''
    };
  }, doc.expediente, doc.descripcion);
}

/**
 * Get process_id by calling AJAX endpoints
 */
async function getProcessId(page: Page, params: any): Promise<string | null> {
  return await page.evaluate(async (p) => {
    const $ = (window as any).$;

    // First AJAX call: Validate notification type
    const validateResult: any = await new Promise((resolve, reject) => {
      $.ajax({
        type: 'POST',
        url: '/Documentos/ValidarTipoNotificacionPorDocumento/',
        dataType: 'json',
        data: {
          tipoJuzgadoId: p.tipoJuzgadoId,
          partidoJudicialId: p.partidoJudicialId,
          documentoId: p.documentoId,
          profesionistaId: p.profesionistaId
        },
        success: (data: any) => resolve(data),
        error: (xhr: any, status: any, error: any) => reject(error)
      });
    });

    if (String(validateResult.result) !== '308') {
      throw new Error(`Not electronic notification (got ${validateResult.result})`);
    }

    // Second AJAX call: Get document
    const documentResult: any = await new Promise((resolve, reject) => {
      $.ajax({
        type: 'GET',
        url: '/Documentos/ObtenerArchivoDocumentoNotificacion/',
        dataType: 'json',
        data: {
          tipoJuzgadoId: p.tipoJuzgadoId,
          partidoJudicialId: p.partidoJudicialId,
          documentoNotificacionId: p.Id,
          documentoId: p.documentoId,
          processId: p.processId
        },
        success: (data: any) => resolve(data),
        error: (xhr: any, status: any, error: any) => reject(error)
      });
    });

    if (!documentResult.result || documentResult.result === 'no') {
      throw new Error('Failed to get document process_id');
    }

    return documentResult.result;
  }, params);
}

/**
 * Fetch PDF from DocumentoBlob endpoint
 */
async function fetchPDF(page: Page, processId: string): Promise<Buffer | null> {
  try {
    const pdfUrl = `https://tribunalelectronico.pjbc.gob.mx/Firma/Validacion/DocumentoBlob?process_id=${processId}`;

    // Get cookies from the current page
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Fetch PDF with session cookies
    const response = await fetch(pdfUrl, {
      headers: {
        'Cookie': cookieString,
        'User-Agent': await page.evaluate(() => navigator.userAgent)
      }
    });

    if (!response.ok) {
      console.error(`[PDF Fetch] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    let pdfBuffer = Buffer.from(arrayBuffer);

    // Check if it's actually a PDF
    const isPDF = pdfBuffer.toString('utf-8', 0, 4) === '%PDF';

    // If it's HTML, try to extract embedded base64 PDF data
    if (!isPDF && contentType?.includes('html')) {
      const htmlContent = pdfBuffer.toString('utf-8');
      const base64Match = htmlContent.match(/JVBERi0[a-zA-Z0-9+/=]+/);

      if (base64Match) {
        const extractedPdfBuffer = Buffer.from(base64Match[0], 'base64');
        const isExtractedPDF = extractedPdfBuffer.toString('utf-8', 0, 4) === '%PDF';

        if (isExtractedPDF) {
          pdfBuffer = extractedPdfBuffer;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    return pdfBuffer;

  } catch (error) {
    console.error('[PDF Fetch] Error:', error);
    return null;
  }
}
