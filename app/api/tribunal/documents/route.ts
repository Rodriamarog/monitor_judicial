/**
 * Tribunal Electrónico Documents API Route
 * GET - Get all tribunal documents for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Documents] Starting GET request');

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[Documents] Auth error:', authError);
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    console.log('[Documents] Authenticated user:', user.id);

    // Fetch documents (RLS enforces user_id)
    const { data: documents, error: docsError } = await supabase
      .from('tribunal_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('[Documents] Query result:', { documentsCount: documents?.length, error: docsError });

    if (docsError) {
      console.error('[Documents] Error:', docsError);
      return NextResponse.json(
        { error: 'Error al obtener documentos', details: docsError.message },
        { status: 500 }
      );
    }

    // Handle case where documents might be null
    if (!documents) {
      return NextResponse.json({
        documents: []
      });
    }

    // Generate signed URLs for PDFs
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let pdfUrl = null;

        if (doc.pdf_path) {
          try {
            const { data: signedUrlData } = await supabase.storage
              .from('tribunal-documents')
              .createSignedUrl(doc.pdf_path, 3600); // 1 hour expiry

            if (signedUrlData) {
              pdfUrl = signedUrlData.signedUrl;
            }
          } catch (error) {
            console.error(`[Documents] Error generating signed URL for ${doc.pdf_path}:`, error);
          }
        }

        return {
          ...doc,
          pdfUrl
        };
      })
    );

    return NextResponse.json({
      documents: documentsWithUrls
    });

  } catch (error) {
    console.error('[Documents] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
