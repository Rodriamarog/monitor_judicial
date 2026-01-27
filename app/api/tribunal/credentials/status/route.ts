/**
 * Tribunal Electrónico Credentials Status API Route
 * GET - Get credentials status for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Get credentials status (RLS enforces user_id)
    const { data: creds, error: credsError } = await supabase
      .from('tribunal_credentials')
      .select('email, status, last_validation_at, last_sync_at, validation_error, key_file_name, cer_file_name')
      .eq('user_id', user.id)
      .single();

    if (credsError) {
      // No credentials found
      if (credsError.code === 'PGRST116') {
        return NextResponse.json({
          hasCredentials: false,
          status: null,
          email: null,
          lastValidationAt: null,
          lastSyncAt: null,
          validationError: null
        });
      }

      console.error('[Credentials Status] Error:', credsError);
      return NextResponse.json(
        { error: 'Error al obtener estado de credenciales' },
        { status: 500 }
      );
    }

    // Return status (never expose vault IDs)
    return NextResponse.json({
      hasCredentials: true,
      status: creds.status,
      email: creds.email,
      lastValidationAt: creds.last_validation_at,
      lastSyncAt: creds.last_sync_at,
      validationError: creds.validation_error,
      keyFileName: creds.key_file_name,
      cerFileName: creds.cer_file_name
    });

  } catch (error) {
    console.error('[Credentials Status] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
