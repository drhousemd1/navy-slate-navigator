
import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types'; // This path should now be valid
import { logger } from '@/lib/logger';

export function useRoleManagement(user: User | null) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check if the user has a role in the user_roles table
  const checkUserRole = useCallback(async () => {
    if (!user) {
      logger.log('useRoleManagement: No user to check role for');
      setUserRole(null);
      setIsAdmin(false);
      return;
    }

    try {
      logger.log('useRoleManagement: Checking user role for', user.email);
      
      // First check if user has an admin role
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('has_role', {
          requested_user_id: user.id,
          requested_role: 'admin'
        });

      if (adminError) {
        logger.error('Error checking admin role:', adminError);
        // Default to user role on error
        setUserRole('user');
        setIsAdmin(false);
        return;
      }

      logger.log('useRoleManagement: User admin check result:', adminCheck);
      
      // For debugging, show all available roles for this user
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
        
      if (!rolesError) {
        logger.log('useRoleManagement: All user roles:', allRoles);
      }
      
      // If admin, set role directly
      if (adminCheck) {
        setUserRole('admin');
        setIsAdmin(true);
        logger.log('useRoleManagement: User is admin');
        return;
      }
      
      // If not admin, query for any assigned role
      // This part might be redundant if the profile table's 'role' field is the source of truth
      // and `user.user_metadata.role` is kept in sync.
      // However, if `user_roles` table is a separate mechanism, this is fine.
      // For now, let's assume `user.user_metadata.role` is the primary source for non-admin roles.
      const metadataRole = user.user_metadata?.role as UserRole;
      if (metadataRole && metadataRole !== 'admin') { // if admin, already handled
        logger.log(`useRoleManagement: Role from user_metadata: ${metadataRole}`);
        setUserRole(metadataRole);
        setIsAdmin(false); // Explicitly false if not admin
      } else if (!metadataRole) {
         // Fallback to 'user_roles' table if metadata role is missing and not admin
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single(); // Assuming one role or primary role if multiple.
      
        if (roleError && roleError.code !== 'PGRST116') { // PGRST116: "No rows found"
          logger.error('Error fetching user role from user_roles table:', roleError);
        }
        
        if (roleData) {
          logger.log('useRoleManagement: User role found in user_roles table:', roleData.role);
          setUserRole(roleData.role as UserRole);
          setIsAdmin(roleData.role === 'admin'); // Should be caught by adminCheck already
        } else {
          logger.log('useRoleManagement: No specific role found (not admin, no metadata role, not in user_roles). Defaulting to "user".');
          setUserRole('user'); // Default if no role found anywhere
          setIsAdmin(false);
        }
      } else {
        // User is not admin, but metadata role was 'admin' (should not happen if adminCheck is first)
        // Or metadata role exists and is not 'admin' - already handled above.
        // This path might indicate an edge case or redundant logic.
        // For safety, if metadata role is 'admin' but adminCheck was false, log warning.
        if (metadataRole === 'admin') {
            logger.warn('useRoleManagement: Mismatch - user.user_metadata.role is admin, but has_role check was false. Prioritizing has_role.');
        }
        setUserRole(metadataRole || 'user'); // Use metadata if exists and not admin, else 'user'
        setIsAdmin(false);
      }
      
    } catch (error) {
      logger.error('Exception checking user role:', error);
      // Default to user role on error
      setUserRole('user');
      setIsAdmin(false);
    }
  }, [user]);

  return {
    userRole,
    isAdmin,
    checkUserRole
  };
}
