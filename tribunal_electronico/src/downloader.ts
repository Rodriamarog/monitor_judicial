import { Browser, Page } from 'puppeteer';
import { Document } from './scraper';
import * as fs from 'fs';
import * as path from 'path';

// Helper to sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\s\-\_\.]/gi, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

export async function downloadDocuments(
  page: Page,
  browser: Browser,
  documents: Document[],
  downloadDir: string = 'data/downloads'
): Promise<{ success: number; failed: number; downloads: any[] }> {

  // Limit to top 10 documents for testing
  const docsToDownload = documents.slice(0, 10);
  console.log(`\nPreparing to download ${docsToDownload.length} documents (one at a time)...`);

  // Create download directory
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const results = {
    success: 0,
    failed: 0,
    downloads: [] as any[]
  };

  console.log('Setting up AJAX interception...');

  // Inject AJAX interception to capture process_id
  await page.evaluate(() => {
    (window as any).__capturedProcessIds = [];

    // Check if jQuery is available
    const $ = (window as any).$;
    if (!$) {
      console.error('jQuery not found!');
      return;
    }

    console.log('jQuery found, setting up interception...');

    // Intercept jQuery AJAX
    const originalAjax = $.ajax;
    $.ajax = function(options: any) {
      console.log('AJAX call intercepted:', options.url);
      const originalSuccess = options.success;
      const originalError = options.error;

      options.success = function(data: any, ...args: any[]) {
        console.log('AJAX success callback:', options.url, 'data.result=', data ? data.result : 'no data');

        // Check if this is the ValidarTipoNotificacionPorDocumento response
        if (options.url && options.url.includes('ValidarTipoNotificacionPorDocumento')) {
          console.log('ValidarTipoNotificacionPorDocumento returned:', data.result);
        }

        // Check if this is the ObtenerArchivoDocumentoNotificacion response
        if (options.url && options.url.includes('ObtenerArchivoDocumentoNotificacion')) {
          console.log('Found ObtenerArchivoDocumentoNotificacion response!');
          if (data && data.result) {
            console.log('Captured process_id:', data.result);
            (window as any).__capturedProcessIds.push(data.result);
          }
        }
        if (originalSuccess) {
          return originalSuccess.call(this, data, ...args);
        }
      };

      options.error = function(xhr: any, status: any, error: any) {
        console.log('AJAX error:', options.url, status, error);
        if (originalError) {
          return originalError.call(this, xhr, status, error);
        }
      };

      return originalAjax.call($, options);
    };
    console.log('AJAX interception setup complete');
  });

  // Set up console message listener to see what's happening in the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('process_id') || text.includes('AJAX') || text.includes('interception') || text.includes('Captured') ||
        text.includes('buttons') || text.includes('Looking for') || text.includes('Found') || text.includes('Could not')) {
      console.log(`  [Browser Console] ${text}`);
    }
  });

  // No need to override window.open or location.reload since we're calling AJAX directly

  for (let i = 0; i < docsToDownload.length; i++) {
    const doc = docsToDownload[i];
    console.log(`\n[${i + 1}/${docsToDownload.length}] Downloading: ${doc.expediente}`);
    console.log(`  Description: ${doc.descripcion}`);

    try {
      // Extract parameters by finding the specific document's button or anchor
      const params = await page.evaluate((targetExpediente, targetDescripcion) => {
        // Check both buttons and anchor tags
        const elements = Array.from(document.querySelectorAll('button[onclick*="VerArchivoNotificacion"], a[onclick*="VerArchivoNotificacion"]'));
        console.log(`Total buttons/links found: ${elements.length}`);
        console.log(`Looking for: ${targetExpediente} - ${targetDescripcion}`);

        // Find element by matching the onclick attribute that contains the description
        let matchedElement: HTMLElement | null = null;

        for (const element of elements) {
          const onclick = (element as HTMLElement).getAttribute('onclick') || '';
          // Check if onclick contains our target description
          if (onclick.includes(targetDescripcion)) {
            matchedElement = element as HTMLElement;
            console.log('Found matching button for target document!');
            console.log(`Element onclick: ${onclick}`);
            break;
          }
        }

        if (!matchedElement) {
          console.log('Could not find element for target document');
          // Log first few elements for debugging
          elements.slice(0, 3).forEach((el, idx) => {
            const onclick = (el as HTMLElement).getAttribute('onclick');
            console.log(`Element ${idx}: ${onclick?.substring(0, 100)}`);
          });
          return null;
        }

        const onclick = matchedElement.getAttribute('onclick');

        if (!onclick) return null;

        // Parse VerArchivoNotificacion(tipoJuzgadoId, partidoJudicialId, Id, documentoId, processId, nameDocument, Index)
        // Note: Index can be -1
        const match = onclick.match(/VerArchivoNotificacion\((\d+),(\d+),(\d+),(\d+),(\d+),'([^']+)',(-?\d+)\)/);
        if (!match) {
          console.log(`Regex did not match onclick: ${onclick}`);
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

      if (!params) {
        console.log('  ✗ Could not extract parameters');
        results.failed++;
        continue;
      }

      console.log(`  Calling AJAX endpoints directly...`);

      // Call the AJAX endpoints directly and get the process_id
      const processId = await page.evaluate(async (p) => {
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

      console.log(`  Got process_id: ${processId}`);

      if (processId) {

        // Fetch the PDF from the DocumentoBlob endpoint
        const pdfUrl = `https://tribunalelectronico.pjbc.gob.mx/Firma/Validacion/DocumentoBlob?process_id=${processId}`;

        console.log(`  Fetching PDF using Node.js fetch with session cookies...`);

        // Get cookies from the current page
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log(`  Using ${cookies.length} cookies for authentication`);

        try {
          // Fetch directly with Node.js
          const response = await fetch(pdfUrl, {
            headers: {
              'Cookie': cookieString,
              'User-Agent': await page.evaluate(() => navigator.userAgent)
            }
          });

          if (!response.ok) {
            console.log(`  ✗ HTTP ${response.status}: ${response.statusText}`);
            results.failed++;
            continue;
          }

          const contentType = response.headers.get('content-type');
          console.log(`  Response Content-Type: ${contentType}`);

          const arrayBuffer = await response.arrayBuffer();
          const pdfBuffer = Buffer.from(arrayBuffer);

          console.log(`  Downloaded ${pdfBuffer.length} bytes`);

          // Check if it's actually a PDF (starts with %PDF)
          const isPDF = pdfBuffer.toString('utf-8', 0, 4) === '%PDF';
          console.log(`  Is valid PDF: ${isPDF}`);

          // If it's HTML, extract the embedded base64 PDF data
          if (!isPDF && contentType?.includes('html')) {
            console.log(`  Response is HTML, extracting embedded PDF data...`);

            const htmlContent = pdfBuffer.toString('utf-8');

            // Search for base64 PDF data (starts with JVBERi0 which is %PDF-1 in base64)
            const base64Match = htmlContent.match(/JVBERi0[a-zA-Z0-9+/=]+/);

            if (base64Match) {
              const base64Data = base64Match[0];
              console.log(`  Found base64 PDF data: ${base64Data.length} characters`);

              try {
                const extractedPdfBuffer = Buffer.from(base64Data, 'base64');
                const isExtractedPDF = extractedPdfBuffer.toString('utf-8', 0, 4) === '%PDF';

                if (isExtractedPDF && extractedPdfBuffer.length > 1000) {
                  console.log(`  ✓ Extracted valid PDF: ${extractedPdfBuffer.length} bytes`);

                  const filename = sanitizeFilename(
                    `${doc.expediente.replace('EXPEDIENTE ', '')}_${doc.descripcion}.pdf`
                  );
                  const filepath = path.join(downloadDir, filename);

                  fs.writeFileSync(filepath, extractedPdfBuffer);
                  const stats = fs.statSync(filepath);

                  console.log(`  ✓ Downloaded: ${filename} (${Math.round(stats.size / 1024)}KB)`);
                  results.success++;
                  results.downloads.push({
                    numero: doc.numero,
                    expediente: doc.expediente,
                    filename: filename,
                    size: stats.size,
                    path: filepath
                  });

                  // Skip the original isPDF check since we already handled it
                  await new Promise(resolve => setTimeout(resolve, 500));
                  continue;
                } else {
                  console.log(`  ✗ Extracted data is not a valid PDF`);
                }
              } catch (e) {
                console.log(`  ✗ Error decoding base64: ${e}`);
              }
            } else {
              console.log(`  ✗ No base64 PDF data found in HTML`);
              fs.writeFileSync('data/html/documento-blob-response.html', pdfBuffer);
            }
          }

          if (isPDF && pdfBuffer.length > 1000) {
            const filename = sanitizeFilename(
              `${doc.expediente.replace('EXPEDIENTE ', '')}_${doc.descripcion}.pdf`
            );
            const filepath = path.join(downloadDir, filename);

            fs.writeFileSync(filepath, pdfBuffer);
            const stats = fs.statSync(filepath);

            console.log(`  ✓ Downloaded: ${filename} (${Math.round(stats.size / 1024)}KB)`);
            results.success++;
            results.downloads.push({
              numero: doc.numero,
              expediente: doc.expediente,
              filename: filename,
              size: stats.size,
              path: filepath
            });
          } else {
            console.log(`  ✗ Not a valid PDF or too small`);
            results.failed++;
          }
        } catch (error) {
          console.log(`  ✗ Fetch error: ${error instanceof Error ? error.message : String(error)}`);
          results.failed++;
        }
      } else {
        console.log('  ✗ No process_id returned');
        results.failed++;
      }

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      results.failed++;
    }
  }

  // No need to restore anything since we didn't override

  console.log('\n' + '='.repeat(60));
  console.log(`Download Summary:`);
  console.log('\n' + '='.repeat(60));
  console.log(`Download Summary:`);
  console.log(`  Success: ${results.success}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Total: ${docsToDownload.length}`);
  console.log('='.repeat(60));

  return results;
}

export function saveDownloadReport(results: any, outputPath: string = 'data/download-report.json'): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      success: results.success,
      failed: results.failed,
      total: results.success + results.failed
    },
    downloads: results.downloads
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nDownload report saved to: ${outputPath}`);
}
