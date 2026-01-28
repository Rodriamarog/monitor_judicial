/**
 * Tribunal Electrónico Credentials API Route
 * POST - Store credentials in Vault (after testing)
 * DELETE - Remove credentials from Vault
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Increase for validation time

/**
 * POST /api/tribunal/credentials
 * Store user's tribunal credentials after testing them
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, keyFileBase64, cerFileBase64, keyFileName, cerFileName, skipValidation } = body;

    if (!email || !password || !keyFileBase64 || !cerFileBase64) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Basic validation
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validate base64 files have content
    if (keyFileBase64.length < 100 || cerFileBase64.length < 100) {
      return NextResponse.json(
        { error: 'Archivos de certificado inválidos' },
        { status: 400 }
      );
    }

    let validationResult: { documentCount?: number } = {};

    // Skip validation if already validated on frontend
    if (!skipValidation) {
      console.log(`[Credentials] Validating credentials via Hetzner...`);

      // Call Hetzner validation endpoint and get validation result
      const validationUrl = process.env.HETZNER_VALIDATION_URL || 'http://localhost:3001/validate-credentials';

      try {
        const validationResponse = await fetch(validationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            keyFileBase64,
            cerFileBase64,
            userId: user.id  // Pass user ID for baseline creation
          })
        });

        if (!validationResponse.ok) {
          return NextResponse.json(
            { error: 'Error al comunicarse con el servidor de validación' },
            { status: 500 }
          );
        }

        // Parse SSE stream to get final result
        const reader = validationResponse.body?.getReader();
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
                    console.log(`[Credentials] ${data.message}`);
                  }
                  if (data.done) {
                    finalResult = data;
                    break;
                  }
                } catch (e) {
                  console.error('[Credentials] Error parsing SSE data:', e);
                }
              }
            }

            if (finalResult) break;
          }
        }

        if (!finalResult || !finalResult.success) {
          return NextResponse.json(
            { error: finalResult?.error || 'Credenciales inválidas' },
            { status: 400 }
          );
        }

        validationResult = finalResult;
        console.log(`[Credentials] Validation successful! Last document date: ${finalResult.lastDocumentDate}`);

      } catch (validationError) {
        console.error('[Credentials] Validation error:', validationError);
        return NextResponse.json(
          { error: 'Error al validar credenciales' },
          { status: 500 }
        );
      }
    } else {
      console.log(`[Credentials] Skipping validation (already validated on frontend)`);
    }

    console.log(`[Credentials] Saving validated credentials for user ${user.id}...`);

    // Create service client for Vault operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has credentials
    const { data: existingCreds } = await supabase
      .from('tribunal_credentials')
      .select('vault_password_id, vault_key_file_id, vault_cer_file_id')
      .eq('user_id', user.id)
      .single();

    // If exists, delete old vault secrets by ID
    if (existingCreds) {
      console.log(`[Credentials] Deleting old vault secrets by ID...`);

      const { data: deletePasswordResult, error: deletePasswordError } = await serviceClient.rpc('vault_delete_secret', {
        secret_id: existingCreds.vault_password_id
      });

      const { data: deleteKeyResult, error: deleteKeyError } = await serviceClient.rpc('vault_delete_secret', {
        secret_id: existingCreds.vault_key_file_id
      });

      const { data: deleteCerResult, error: deleteCerError } = await serviceClient.rpc('vault_delete_secret', {
        secret_id: existingCreds.vault_cer_file_id
      });

      // Log any delete errors (but don't fail the whole operation if secrets are already gone)
      if (deletePasswordError || deleteKeyError || deleteCerError) {
        console.warn('[Credentials] Some vault secrets may have already been deleted:', {
          deletePasswordError,
          deleteKeyError,
          deleteCerError
        });
      }

      console.log(`[Credentials] Delete results:`, {
        password: deletePasswordResult,
        key: deleteKeyResult,
        cer: deleteCerResult
      });
    }

    // Store new secrets in Vault using public wrapper functions
    console.log(`[Credentials] Creating vault secrets...`);

    const { data: passwordId, error: passwordError } = await serviceClient
      .rpc('vault_create_secret', {
        secret_value: password,
        secret_name: `tribunal_password_${user.id}`,
        secret_description: `Tribunal Electrónico password for user ${user.id}`
      });

    const { data: keyFileId, error: keyError } = await serviceClient
      .rpc('vault_create_secret', {
        secret_value: keyFileBase64,
        secret_name: `tribunal_key_${user.id}`,
        secret_description: `Tribunal Electrónico .key file for user ${user.id}`
      });

    const { data: cerFileId, error: cerError } = await serviceClient
      .rpc('vault_create_secret', {
        secret_value: cerFileBase64,
        secret_name: `tribunal_cer_${user.id}`,
        secret_description: `Tribunal Electrónico .cer file for user ${user.id}`
      });

    if (passwordError || keyError || cerError) {
      console.error('[Credentials] Vault error:', { passwordError, keyError, cerError });

      // Check if it's a duplicate key error
      const isDuplicate = passwordError?.code === '23505' || keyError?.code === '23505' || cerError?.code === '23505';

      if (isDuplicate) {
        return NextResponse.json(
          {
            error: 'Error al actualizar credenciales. Por favor intenta eliminar las credenciales actuales primero y luego guardar nuevas.'
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error al guardar credenciales en Vault' },
        { status: 500 }
      );
    }

    // Upsert tribunal_credentials row with explicit conflict resolution
    const { error: upsertError } = await supabase
      .from('tribunal_credentials')
      .upsert({
        user_id: user.id,
        email,
        vault_password_id: passwordId,
        vault_key_file_id: keyFileId,
        vault_cer_file_id: cerFileId,
        key_file_name: keyFileName || 'archivo.key',
        cer_file_name: cerFileName || 'archivo.cer',
        status: 'active',
        last_validation_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('[Credentials] Upsert error:', upsertError);

      // Rollback: delete the vault secrets we just created
      console.log('[Credentials] Rolling back vault secrets due to upsert error...');
      await serviceClient.rpc('vault_delete_secret', { secret_id: passwordId });
      await serviceClient.rpc('vault_delete_secret', { secret_id: keyFileId });
      await serviceClient.rpc('vault_delete_secret', { secret_id: cerFileId });

      return NextResponse.json(
        { error: 'Error al guardar credenciales' },
        { status: 500 }
      );
    }

    console.log(`[Credentials] ✓ Credentials saved for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Credenciales guardadas exitosamente'
    });

  } catch (error) {
    console.error('[Credentials] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tribunal/credentials
 * Remove user's tribunal credentials
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Get vault IDs from credentials
    const { data: creds } = await supabase
      .from('tribunal_credentials')
      .select('vault_password_id, vault_key_file_id, vault_cer_file_id')
      .eq('user_id', user.id)
      .single();

    if (!creds) {
      return NextResponse.json(
        { error: 'No se encontraron credenciales' },
        { status: 404 }
      );
    }

    // Delete credentials row FIRST (before vault secrets)
    // This prevents orphaned vault secrets if the DB delete fails
    const { error: deleteError } = await supabase
      .from('tribunal_credentials')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[Credentials] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar credenciales' },
        { status: 500 }
      );
    }

    // Now delete vault secrets using RPC wrapper
    console.log(`[Credentials] Deleting vault secrets for user ${user.id}...`);

    // Create service client for Vault operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    await serviceClient.rpc('vault_delete_secret', {
      secret_id: creds.vault_password_id
    });
    await serviceClient.rpc('vault_delete_secret', {
      secret_id: creds.vault_key_file_id
    });
    await serviceClient.rpc('vault_delete_secret', {
      secret_id: creds.vault_cer_file_id
    });

    console.log(`[Credentials] ✓ Credentials deleted for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Credenciales eliminadas exitosamente'
    });

  } catch (error) {
    console.error('[Credentials] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
