
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useUserProfile(user: User | null, setUser: (user: User | null) => void) {
  // Update user nickname
  const updateNickname = (nickname: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          nickname
        }
      };
      setUser(updatedUser);
    }
  };

  // Update user profile image
  const updateProfileImage = (imageUrl: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          avatar_url: imageUrl
        }
      };
      setUser(updatedUser);
    }
  };

  // Get user nickname
  const getNickname = (): string => {
    if (!user) return 'Guest';
    
    if (user.user_metadata?.nickname) {
      return user.user_metadata.nickname;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  };

  // Get user profile image
  const getProfileImage = (): string => {
    if (!user) return '';
    return user.user_metadata?.avatar_url || '';
  };

  // Get user role
  const getUserRole = (): string => {
    if (!user) return 'Submissive'; // Default role with proper capitalization
    
    // Get the role from metadata and ensure it's properly capitalized
    const role = user.user_metadata?.role || 'Submissive';
    
    // Ensure first letter is capitalized (in case it's stored lowercase in the database)
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Update user role
  const updateUserRole = async (role: string) => {
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { 
            role 
          }
        });
        
        if (error) {
          console.error('Error updating user role:', error);
          toast({
            title: 'Error updating role',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }
        
        const updatedUser = {
          ...user,
          user_metadata: {
            ...(user.user_metadata || {}),
            role
          }
        };
        setUser(updatedUser);
        
        toast({
          title: 'Role updated',
          description: `Your role has been updated to ${role}`,
        });
      } catch (error: any) {
        console.error('Exception during user role update:', error);
        toast({
          title: 'Error updating role',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  return {
    updateNickname,
    getNickname,
    updateProfileImage,
    getProfileImage,
    getUserRole,
    updateUserRole
  };
}
