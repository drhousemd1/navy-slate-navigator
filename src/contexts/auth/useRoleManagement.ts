
import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types';

export function useRoleManagement(user: User | null) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check if the user has a role in the user_roles table
  const checkUserRole = useCallback(async () => {
    if (!user) {
      console.log('useRoleManagement: No user to check role for');
      setUserRole(null);
      setIsAdmin(false);
      return;
    }

    try {
      console.log('useRoleManagement: Checking user role for', user.email);
      
      // First check if user has an admin role
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('has_role', {
          requested_user_id: user.id,
          requested_role: 'admin'
        });

      if (adminError) {
        console.error('Error checking admin role:', adminError);
        return;
      }

      console.log('useRoleManagement: User admin check result:', adminCheck);
      
      // If admin, set role directly
      if (adminCheck) {
        setUserRole('admin');
        setIsAdmin(true);
        console.log('useRoleManagement: User is admin');
        return;
      }
      
      // If not admin, query for any assigned role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') { // Not found is ok
        console.error('Error fetching user role:', roleError);
      }
      
      if (roleData) {
        console.log('useRoleManagement: User role found:', roleData.role);
        setUserRole(roleData.role as UserRole);
        setIsAdmin(roleData.role === 'admin');
      } else {
        console.log('useRoleManagement: No role found, setting as user');
        setUserRole('user');
        setIsAdmin(false);
      }
      
    } catch (error) {
      console.error('Exception checking user role:', error);
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
