
import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types';
import { logger } from '@/lib/logger';

export function useRoleManagement(user: User | null) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check if the user has a role in the user_roles table
  const checkUserRole = useCallback(async () => {
    if (!user) {
      logger.debug('useRoleManagement: No user to check role for');
      setUserRole(null);
      setIsAdmin(false);
      return;
    }

    try {
      logger.debug('useRoleManagement: Checking user role for', user.email);
      
      // First check if user has an admin role using the database function
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

      logger.debug('useRoleManagement: User admin check result:', adminCheck);
      
      // If admin, set role directly
      if (adminCheck) {
        setUserRole('admin');
        setIsAdmin(true);
        logger.debug('useRoleManagement: User is admin');
        return;
      }
      
      // If not admin, query for any assigned role with proper RLS filtering
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') { // Not found is ok
        logger.error('Error fetching user role:', roleError);
      }
      
      if (roleData) {
        logger.debug('useRoleManagement: User role found:', roleData.role);
        setUserRole(roleData.role as UserRole);
        setIsAdmin(roleData.role === 'admin');
      } else {
        logger.debug('useRoleManagement: No role found, setting as user');
        setUserRole('user');
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
