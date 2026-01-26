/**
 * Tribunal Electrónico Credentials API Route
 * POST - Store credentials in Vault (after testing)
 * DELETE - Remove credentials from Vault
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
    const { email, password, keyFileBase64, cerFileBase64 } = body;

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

    console.log(`[Credentials] Saving credentials for user ${user.id} (will be tested on first sync)...`);

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

    // If exists, delete old vault secrets
    if (existingCreds) {
      console.log(`[Credentials] Deleting old vault secrets...`);
      await serviceClient.rpc('vault_delete_secret', {
        secret_id: existingCreds.vault_password_id
      });
      await serviceClient.rpc('vault_delete_secret', {
        secret_id: existingCreds.vault_key_file_id
      });
      await serviceClient.rpc('vault_delete_secret', {
        secret_id: existingCreds.vault_cer_file_id
      });
    }

    // Store new secrets in Vault
    console.log(`[Credentials] Creating vault secrets...`);
    const { data: passwordId, error: passwordError } = await serviceClient.rpc(
      'vault_create_secret',
      {
        secret_value: password,
        secret_name: `tribunal_password_${user.id}`,
        secret_description: `Tribunal Electrónico password for user ${user.id}`
      }
    );

    const { data: keyFileId, error: keyError } = await serviceClient.rpc(
      'vault_create_secret',
      {
        secret_value: keyFileBase64,
        secret_name: `tribunal_key_${user.id}`,
        secret_description: `Tribunal Electrónico .key file for user ${user.id}`
      }
    );

    const { data: cerFileId, error: cerError } = await serviceClient.rpc(
      'vault_create_secret',
      {
        secret_value: cerFileBase64,
        secret_name: `tribunal_cer_${user.id}`,
        secret_description: `Tribunal Electrónico .cer file for user ${user.id}`
      }
    );

    if (passwordError || keyError || cerError) {
      console.error('[Credentials] Vault error:', { passwordError, keyError, cerError });
      return NextResponse.json(
        { error: 'Error al guardar credenciales en Vault' },
        { status: 500 }
      );
    }

    // Upsert tribunal_credentials row
    const { error: upsertError } = await supabase
      .from('tribunal_credentials')
      .upsert({
        user_id: user.id,
        email,
        vault_password_id: passwordId,
        vault_key_file_id: keyFileId,
        vault_cer_file_id: cerFileId,
        status: 'active',
        last_document_numero: 0,
        last_validation_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('[Credentials] Upsert error:', upsertError);
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

    // Create service client for Vault operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Delete vault secrets
    console.log(`[Credentials] Deleting vault secrets for user ${user.id}...`);
    await serviceClient.rpc('vault_delete_secret', {
      secret_id: creds.vault_password_id
    });
    await serviceClient.rpc('vault_delete_secret', {
      secret_id: creds.vault_key_file_id
    });
    await serviceClient.rpc('vault_delete_secret', {
      secret_id: creds.vault_cer_file_id
    });

    // Delete credentials row
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
