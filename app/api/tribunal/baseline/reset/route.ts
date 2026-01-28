/**
 * Baseline Reset API Route
 * POST - Re-run credential validation to recreate baseline snapshot
 *
 * This is useful when users want to mark all current documents as "seen"
 * and only receive alerts for truly new documents going forward.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/tribunal/baseline/reset
 * Reset baseline by re-running validation to capture current documents
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get credentials to verify user has TE setup
    const { data: creds } = await supabase
      .from('tribunal_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!creds) {
      return NextResponse.json(
        { error: 'No credentials found' },
        { status: 404 }
      );
    }

    console.log(`[Baseline Reset] Starting for user ${user.id}`);

    // Create service client for Vault operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Get credentials from vault
    const { data: password } = await serviceClient.rpc('vault_get_secret', {
      secret_id: creds.vault_password_id
    });
    const { data: keyFileBase64 } = await serviceClient.rpc('vault_get_secret', {
      secret_id: creds.vault_key_file_id
    });
    const { data: cerFileBase64 } = await serviceClient.rpc('vault_get_secret', {
      secret_id: creds.vault_cer_file_id
    });

    if (!password || !keyFileBase64 || !cerFileBase64) {
      return NextResponse.json(
        { error: 'Failed to retrieve credentials from vault' },
        { status: 500 }
      );
    }

    // Call Hetzner to re-run validation and recreate baseline
    const validationUrl = process.env.HETZNER_VALIDATION_URL || 'http://localhost:3001/validate-credentials';

    const response = await fetch(validationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creds.email,
        password,
        keyFileBase64,
        cerFileBase64,
        userId: user.id
      })
    });

    if (!response.ok) {
      console.error('[Baseline Reset] Validation request failed');
      return NextResponse.json(
        { error: 'Failed to reset baseline' },
        { status: 500 }
      );
    }

    // Parse SSE stream to get final result
    const reader = response.body?.getReader();
    let finalResult = null;

    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) {
                console.log(`[Baseline Reset] ${data.message}`);
              }
              if (data.done) {
                finalResult = data;
                break;
              }
            } catch (e) {
              console.error('[Baseline Reset] Error parsing SSE data:', e);
            }
          }
        }

        if (finalResult) break;
      }
    }

    if (!finalResult || !finalResult.success) {
      return NextResponse.json(
        { error: finalResult?.error || 'Failed to reset baseline' },
        { status: 500 }
      );
    }

    console.log(`[Baseline Reset] ✓ Success for user ${user.id}, ${finalResult.documentCount} documents in new baseline`);

    return NextResponse.json({
      success: true,
      message: 'Baseline reseteado exitosamente',
      documentCount: finalResult.documentCount,
      baselineCreated: finalResult.baselineCreated
    });

  } catch (error) {
    console.error('[Baseline Reset] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
