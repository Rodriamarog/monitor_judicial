import { Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export interface Document {
  numero: number;
  expediente: string;
  expedienteLink: string;
  juzgado: string;
  fechaPublicacion: string;
  ciudad: string;
  descripcion: string;
  promociones: string;
  downloadOnclick?: string;
}

export async function scrapeDocumentos(page: Page): Promise<Document[]> {
  console.log('Scraping documents from Documentos page...');

  // Extract document information based on the actual HTML structure
  const documents = await page.evaluate(() => {
    const results: any[] = [];

    // Each document is in a div with class="row p-10" and border style
    const documentRows = Array.from(
      document.querySelectorAll('div.row.p-10[style*="border"]')
    );

    console.log(`Found ${documentRows.length} document rows`);

    documentRows.forEach((row, index) => {
      try {
        // Extract numero (position in list)
        const numeroSpan = row.querySelector('.pr-10.pb-20.pull-left.text-center span');
        const numero = numeroSpan ? parseInt(numeroSpan.textContent?.trim() || '0') : index + 1;

        // Extract expediente number and link
        const expedienteLink = row.querySelector('a[href*="Expediente"]') as HTMLAnchorElement;
        const expedienteSpan = expedienteLink?.querySelector('.text-defualt');
        const expediente = expedienteSpan?.textContent?.trim() || '';
        const expedienteLinkHref = expedienteLink?.href || '';

        // Extract juzgado
        const juzgadoSpan = row.querySelector('.text-italic');
        const juzgado = juzgadoSpan?.textContent?.trim() || '';

        // Extract fecha publicación - it's in a span after "Fecha Publicación" text
        const fechaContainer = row.querySelector('.col-sm-3.col-xs-4.text-right, .text-right');
        const fechaText = fechaContainer?.textContent || '';
        const fechaMatch = fechaText.match(/(\d{2}\/\d{2}\/\d{4})/);
        const fechaPublicacion = fechaMatch ? fechaMatch[1] : '';

        // Extract ciudad
        const ciudadMatch = fechaText.match(/(TIJUANA|MEXICALI|ENSENADA|TECATE|ROSARITO)/i);
        const ciudad = ciudadMatch ? ciudadMatch[1] : '';

        // Extract descripción - it's in the span.text-defualt within the col-sm-4 column
        const descripcionContainer = row.querySelector('.col-sm-4.col-xs-9');
        const descripcionLink = descripcionContainer?.querySelector('a span.text-defualt');
        const descripcion = descripcionLink?.textContent?.trim() || '';

        // Extract promociones number
        const promocionesText = descripcionContainer?.textContent || '';
        const promocionesMatch = promocionesText.match(/Promocione?\(es\)\s*(\d+)/i);
        const promociones = promocionesMatch ? promocionesMatch[1] : '';

        // Extract download button onclick
        const downloadBtn = row.querySelector('button[onclick*="VerArchivoNotificacion"]') as HTMLButtonElement;
        const downloadOnclick = downloadBtn?.getAttribute('onclick') || undefined;

        if (expediente) {
          results.push({
            numero,
            expediente,
            expedienteLink: expedienteLinkHref,
            juzgado,
            fechaPublicacion,
            ciudad,
            descripcion,
            promociones,
            downloadOnclick
          });
        }
      } catch (error) {
        console.error(`Error parsing document row ${index}:`, error);
      }
    });

    return results;
  });

  // Sort documents by their numero (position number) to match visual order on page
  documents.sort((a, b) => a.numero - b.numero);

  console.log(`Extracted ${documents.length} documents`);

  // Log first few documents as sample if available
  if (documents.length > 0) {
    console.log('\nSample documents:');
    documents.slice(0, 3).forEach(doc => {
      console.log(`  ${doc.numero}. ${doc.expediente} - ${doc.juzgado}`);
      console.log(`     ${doc.descripcion}`);
    });
  }

  return documents;
}

export function saveDocumentsToJSON(documents: Document[], outputPath: string = 'data/documentos.json'): void {
  // Create data directory if it doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Add metadata
  const output = {
    scrapedAt: new Date().toISOString(),
    totalDocuments: documents.length,
    documents: documents
  };

  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Saved ${documents.length} documents to ${outputPath}`);
}
