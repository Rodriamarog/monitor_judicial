'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * User role types
 */
export type UserRole = 'master' | 'collaborator' | null;

/**
 * User role information returned by the hook
 */
export interface UserRoleInfo {
  /** User's role (master or collaborator) */
  role: UserRole;
  /** Current user's ID */
  userId: string | null;
  /** True if user is a collaborator */
  isCollaborator: boolean;
  /** True if user is a master account */
  isMaster: boolean;
  /** ID of the master user (only for collaborators) */
  masterUserId: string | null;
  /** True while loading role information */
  loading: boolean;
}

/**
 * Hook to detect user role (master or collaborator)
 *
 * Usage:
 * ```tsx
 * const { isCollaborator, isMaster, loading } = useUserRole();
 *
 * if (loading) return <Spinner />;
 * if (isCollaborator) return <ReadOnlyView />;
 * return <FullAccessView />;
 * ```
 */
export function useUserRole(): UserRoleInfo {
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo>({
    role: null,
    userId: null,
    isCollaborator: false,
    isMaster: false,
    masterUserId: null,
    loading: true,
  });

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRoleInfo({
          role: null,
          userId: null,
          isCollaborator: false,
          isMaster: false,
          masterUserId: null,
          loading: false,
        });
        return;
      }

      // Fetch user profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[useUserRole] Error fetching profile:', profileError);
        setRoleInfo({
          role: 'master', // Default to master on error
          userId: user.id,
          isCollaborator: false,
          isMaster: true,
          masterUserId: null,
          loading: false,
        });
        return;
      }

      const role = (profile?.role as UserRole) || 'master';

      // If collaborator, fetch master user ID
      let masterUserId: string | null = null;
      if (role === 'collaborator') {
        const { data: collab, error: collabError } = await supabase
          .from('collaborators')
          .select('master_user_id')
          .eq('collaborator_user_id', user.id)
          .eq('status', 'active')
          .single();

        if (collabError) {
          console.error('[useUserRole] Error fetching collaborator relationship:', collabError);
        } else {
          masterUserId = collab?.master_user_id || null;
        }
      }

      setRoleInfo({
        role,
        userId: user.id,
        isCollaborator: role === 'collaborator',
        isMaster: role === 'master',
        masterUserId,
        loading: false,
      });
    }

    fetchRole();
  }, []);

  return roleInfo;
}
