
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useUserProfile(user: User | null, setUser: (user: User | null) => void) {
  // Update user nickname
  const updateNickname = (nickname: string) => {
    if (user) {
      // Update user metadata in Supabase Auth
      supabase.auth.updateUser({
        data: {
          nickname
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Error updating nickname in Auth:', error);
          return;
        }
        
        if (data.user) {
          setUser(data.user);
        }
      });
    }
  };

  // Update user profile image
  const updateProfileImage = (imageUrl: string) => {
    if (user) {
      // Update user metadata in Supabase Auth
      supabase.auth.updateUser({
        data: {
          avatar_url: imageUrl
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Error updating avatar in Auth:', error);
          return;
        }
        
        if (data.user) {
          setUser(data.user);
        }
      });
      
      // Also update the profile table
      supabase.from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating avatar in profiles:', error);
          }
        });
    }
  };

  // Get user nickname - now returns a string instead of Promise<string>
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

  // Get user profile image - now returns a string instead of Promise<string>
  const getProfileImage = (): string => {
    if (!user) return '';
    return user.user_metadata?.avatar_url || '';
  };

  // Get user role - now returns a string instead of Promise<string>
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
          data: { role }
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
        
        // Also update the role in the user_roles table if needed
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ 
            user_id: user.id, 
            role: role.toLowerCase() === 'admin' ? 'admin' : 'user'  // Convert to allowed enum values
          }, { onConflict: 'user_id' });
          
        if (roleError) {
          console.error('Error updating role in database:', roleError);
        }
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
