
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types';
import { useState } from 'react';

export function useRoleManagement(user: User | null) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // This function checks if the user has an admin role
  const checkUserRole = async () => {
    if (!user) {
      setUserRole(null);
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data) {
        setUserRole(data.role as UserRole);
        setIsAdmin(data.role === 'admin');
      } else {
        // Default to user role if no specific role is found
        setUserRole('user');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  return {
    userRole,
    isAdmin,
    checkUserRole
  };
}
