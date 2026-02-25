import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationLogger } from '@/lib/notification-logger';

/**
 * POST /api/collaborators/setup-password
 * Finalize collaborator account creation with user-chosen password
 *
 * Body: { token: string, password: string }
 */
export async function POST(request: NextRequest) {
  const logger = createNotificationLogger(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Find invitation by token
    const { data: invitation, error: invitationError } = await serviceSupabase
      .from('collaborator_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Token de invitación inválido' },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'accepted') {
      logger.invitationWarn('Invitation not in accepted state', token, { status: invitation.status });
      return NextResponse.json(
        { error: 'Esta invitación ya no está disponible' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === invitation.collaborator_email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este correo electrónico' },
        { status: 400 }
      );
    }

    // Create the user account with their chosen password
    const { data: newUserData, error: createError } = await serviceSupabase.auth.admin.createUser({
      email: invitation.collaborator_email,
      password: password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        role: 'collaborator',
        invited_by: invitation.owner_id,
      },
    });

    if (createError || !newUserData.user) {
      logger.invitationError('Auth user creation failed', token, {
        auth_error: createError?.message,
      });
      return NextResponse.json(
        { error: 'Error al crear la cuenta' },
        { status: 500 }
      );
    }

    const collaboratorUserId = newUserData.user.id;

    // Update role in user_profiles
    await serviceSupabase
      .from('user_profiles')
      .update({ role: 'collaborator' })
      .eq('id', collaboratorUserId);

    // Create collaborator relationship
    await serviceSupabase
      .from('collaborators')
      .insert({
        master_user_id: invitation.owner_id,
        collaborator_user_id: collaboratorUserId,
        collaborator_email: invitation.collaborator_email,
        status: 'active',
      });

    // Add to collaborator_emails (backward compatibility)
    const { data: ownerProfile } = await serviceSupabase
      .from('user_profiles')
      .select('collaborator_emails')
      .eq('id', invitation.owner_id)
      .single();

    if (ownerProfile) {
      const currentEmails = ownerProfile.collaborator_emails || [];
      const updatedEmails = Array.from(new Set([...currentEmails, invitation.collaborator_email]));

      await serviceSupabase
        .from('user_profiles')
        .update({ collaborator_emails: updatedEmails })
        .eq('id', invitation.owner_id);
    }

    logger.invitationInfo('Account created', token, {
      collaborator_user_id: collaboratorUserId,
      owner_id: invitation.owner_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente',
    });
  } catch (error) {
    logger.error('Unexpected error in setup-password', undefined, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await logger.flush();
  }
}
