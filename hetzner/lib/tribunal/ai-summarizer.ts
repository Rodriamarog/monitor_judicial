/**
 * Tribunal Document AI Summarizer
 * Generates summaries of tribunal documents using Gemini
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getGeminiClient } from '../gemini';

export interface SummaryParams {
  pdfPath: string;
  supabase: SupabaseClient;
  expediente: string;
  juzgado: string;
  descripcion: string;
}

export interface SummaryResult {
  success: boolean;
  summary?: string;
  error?: string;
}

/**
 * Generate AI summary for a tribunal document
 */
export async function generateDocumentSummary(
  params: SummaryParams
): Promise<SummaryResult> {
  const { pdfPath, supabase, expediente, juzgado, descripcion } = params;

  try {
    // Download PDF from storage
    console.log(`[AI Summary] Downloading PDF from storage: ${pdfPath}`);
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('tribunal-documents')
      .download(pdfPath);

    if (downloadError || !pdfData) {
      console.error('[AI Summary] Download error:', downloadError);
      return {
        success: false,
        error: `Error al descargar PDF: ${downloadError?.message || 'No data'}`
      };
    }

    // Convert to base64
    const arrayBuffer = await pdfData.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');

    // Call Gemini with PDF
    console.log(`[AI Summary] Generating summary with Gemini...`);
    const gemini = getGeminiClient();
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analiza este documento legal del Tribunal Electrónico de Baja California.

Expediente: ${expediente}
Juzgado: ${juzgado}
Descripción: ${descripcion}

Por favor proporciona:
1. Tipo de documento (ej: acuerdo, auto, sentencia, notificación)
2. Resumen ejecutivo (2-3 oraciones) de lo más importante
3. Acciones requeridas o fechas límite (si aplica)

Responde de manera concisa y enfocada en lo relevante para un abogado.`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      }
    ]);

    const response = result.response;
    const summary = response.text();

    if (!summary) {
      return {
        success: false,
        error: 'No se generó resumen'
      };
    }

    console.log(`[AI Summary] ✓ Summary generated (${summary.length} chars)`);

    return {
      success: true,
      summary
    };

  } catch (error) {
    console.error('[AI Summary] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al generar resumen'
    };
  }
}
