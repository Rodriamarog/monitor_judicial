import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendCollaboratorCredentials } from '@/lib/email';

/**
 * GET /api/collaborators/accept?token=XXX&action=accept|reject
 * Public route for accepting/rejecting invitations
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const token = searchParams.get('token');
  const action = searchParams.get('action');

  // Validate parameters
  if (!token) {
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=invalid', request.url)
    );
  }

  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=invalid', request.url)
    );
  }

  // Find invitation by token (using service role to bypass RLS for public access)
  const { data: invitation, error: fetchError } = await supabase
    .from('collaborator_invitations')
    .select('*')
    .eq('invitation_token', token)
    .single();

  if (fetchError || !invitation) {
    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=invalid', request.url)
    );
  }

  // Check if invitation is expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Update status to expired
    await supabase
      .from('collaborator_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);

    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=expired', request.url)
    );
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    return NextResponse.redirect(
      new URL(`/collaborator/invitation-response?status=${invitation.status}`, request.url)
    );
  }

  // Process action
  if (action === 'accept') {
    try {
      const serviceSupabase = createServiceClient();

      // Check if user exists with this email
      const { data: existingUsers, error: listError } = await serviceSupabase.auth.admin.listUsers();

      if (listError) {
        console.error('[Collaborators] Error listing users:', listError);
        return NextResponse.redirect(
          new URL('/collaborator/invitation-response?status=error', request.url)
        );
      }

      const existingUser = existingUsers.users.find(u => u.email === invitation.collaborator_email);

      let collaboratorUserId: string;
      let generatedPassword: string | null = null;

      if (!existingUser) {
        // Generate secure password for new collaborator
        generatedPassword = generateSecurePassword();

        // Create auth account
        const { data: newUserData, error: createError } = await serviceSupabase.auth.admin.createUser({
          email: invitation.collaborator_email,
          password: generatedPassword,
          email_confirm: true, // Skip email verification
          user_metadata: {
            role: 'collaborator',
            invited_by: invitation.owner_id,
          },
        });

        if (createError || !newUserData.user) {
          console.error('[Collaborators] Error creating user:', createError);
          return NextResponse.redirect(
            new URL('/collaborator/invitation-response?status=error', request.url)
          );
        }

        collaboratorUserId = newUserData.user.id;

        // Update role in user_profiles (should be auto-created by trigger)
        await serviceSupabase
          .from('user_profiles')
          .update({ role: 'collaborator' })
          .eq('id', collaboratorUserId);

        console.log(`[Collaborators] Created new user account: ${invitation.collaborator_email}`);
      } else {
        collaboratorUserId = existingUser.id;
        console.log(`[Collaborators] User already exists: ${invitation.collaborator_email}`);
      }

      // Create collaborator relationship
      const { error: collabError } = await serviceSupabase
        .from('collaborators')
        .insert({
          master_user_id: invitation.owner_id,
          collaborator_user_id: collaboratorUserId,
          collaborator_email: invitation.collaborator_email,
          status: 'active',
        });

      if (collabError) {
        console.error('[Collaborators] Error creating collaborator relationship:', collabError);
        return NextResponse.redirect(
          new URL('/collaborator/invitation-response?status=error', request.url)
        );
      }

      // Add email to owner's collaborator_emails (for backward compatibility)
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

      // Update invitation status
      await serviceSupabase
        .from('collaborator_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      // Send credentials email if new account was created
      if (generatedPassword) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://monitorjudicial.com.mx';
        const loginUrl = `${siteUrl}/login`;

        const emailResult = await sendCollaboratorCredentials({
          collaboratorEmail: invitation.collaborator_email,
          temporaryPassword: generatedPassword,
          loginUrl,
        });

        if (!emailResult.success) {
          console.error('[Collaborators] Failed to send credentials email:', emailResult.error);
          // Don't fail the entire operation if email fails
        } else {
          console.log(`[Collaborators] Credentials email sent to: ${invitation.collaborator_email}`);
        }
      }

      console.log(`[Collaborators] Invitation accepted: ${invitation.collaborator_email}`);

      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=accepted', request.url)
      );
    } catch (error) {
      console.error('[Collaborators] Unexpected error during acceptance:', error);
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }
  } else {
    // Reject invitation
    const { error: updateError } = await supabase
      .from('collaborator_invitations')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.redirect(
        new URL('/collaborator/invitation-response?status=error', request.url)
      );
    }

    console.log(`[Collaborators] Invitation rejected: ${invitation.collaborator_email}`);

    return NextResponse.redirect(
      new URL('/collaborator/invitation-response?status=rejected', request.url)
    );
  }
}

/**
 * Generate a secure random password for new collaborator accounts
 * @returns A 16-character random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}
