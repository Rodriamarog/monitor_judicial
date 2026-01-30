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
    const model = gemini.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `Analiza este documento legal del Tribunal Electrónico de Baja California.

Expediente: ${expediente}
Juzgado: ${juzgado}
Descripción: ${descripcion}

IMPORTANTE: Este resumen se enviará por WhatsApp, así que debe ser EXTREMADAMENTE CONCISO.

Proporciona un resumen que incluya:
1. Tipo de documento en 2-3 palabras (ej: "Auto de trámite", "Sentencia definitiva")
2. La idea GENERAL del documento (sin detalles específicos)
3. Si requiere acción urgente o no

Reglas estrictas:
- NO uses asteriscos, negritas, ni formato markdown
- NO uses viñetas ni números
- Máximo 100 palabras (3-4 oraciones cortas)
- NO incluyas números de caso, fechas específicas, nombres de partes, ni números de oficios
- Enfócate en el "qué" de manera general, no en los detalles
- Cada oración debe ser corta y directa

Buenos ejemplos:
- "Auto de trámite. Se recibieron las pruebas ofrecidas. La admisión se resolverá después. No hay acciones urgentes."
- "Notificación. Se agregó un oficio relacionado con amparo. Solo es informativo."
- "Acuerdo. Se programa audiencia próximamente. Debe comparecer cuando sea citado."

Mal ejemplo (demasiado detalle):
- "Auto de trámite. El juzgado agrega el oficio 18832/2025 del Juzgado Decimosexto sobre amparo 748/2025-I de Metlife México dictado el 27 de enero..."`;


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
