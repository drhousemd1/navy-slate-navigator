
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useUserProfile(user: User | null, setUser: (user: User | null) => void) {
  // Update user nickname
  const updateNickname = async (nickname: string) => {
    if (!user) return { error: { message: 'No user logged in' } };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user.id);
      
      if (!error) {
        // Update local user object for immediate UI updates
        const updatedUser = {
          ...user,
          user_metadata: {
            ...(user.user_metadata || {}),
            nickname
          }
        };
        setUser(updatedUser);
      }
      
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  // Update user profile image
  const updateProfileImage = async (imageUrl: string) => {
    if (!user) return { error: { message: 'No user logged in' } };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id);
      
      if (!error) {
        // Update local user object for immediate UI updates
        const updatedUser = {
          ...user,
          user_metadata: {
            ...(user.user_metadata || {}),
            avatar_url: imageUrl
          }
        };
        setUser(updatedUser);
      }
      
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  // Get user nickname
  const getNickname = async (): Promise<string | null> => {
    if (!user) return 'Guest';
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching nickname:', error);
        // Fall back to metadata or email
        if (user.user_metadata?.nickname) {
          return user.user_metadata.nickname;
        }
        
        if (user.email) {
          return user.email.split('@')[0];
        }
        
        return 'User';
      }
      
      // Return data.nickname if exists, otherwise fallback options
      if (data && data.nickname) {
        return data.nickname;
      } else if (user.user_metadata?.nickname) {
        return user.user_metadata.nickname;
      } else if (user.email) {
        return user.email.split('@')[0];
      }
      
      return 'User';
    } catch (error) {
      console.error('Exception while getting nickname:', error);
      
      // Fallbacks if there's an error
      if (user.user_metadata?.nickname) {
        return user.user_metadata.nickname;
      }
      
      if (user.email) {
        return user.email.split('@')[0];
      }
      
      return 'User';
    }
  };

  // Get user profile image
  const getProfileImage = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile image:', error);
        // Fall back to metadata
        return user.user_metadata?.avatar_url || null;
      }
      
      return data?.avatar_url || user.user_metadata?.avatar_url || null;
    } catch (error) {
      console.error('Exception while getting profile image:', error);
      return user.user_metadata?.avatar_url || null;
    }
  };

  // Get user role
  const getUserRole = async (): Promise<string> => {
    if (!user) return 'Submissive';
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        // Fall back to metadata or default
        const role = user.user_metadata?.role || 'Submissive';
        return role.charAt(0).toUpperCase() + role.slice(1);
      }
      
      // Ensure first letter is capitalized (in case it's stored lowercase in the database)
      const role = data?.role || user.user_metadata?.role || 'Submissive';
      return role.charAt(0).toUpperCase() + role.slice(1);
    } catch (error) {
      console.error('Exception while getting user role:', error);
      
      // Fallback to metadata or default
      const role = user.user_metadata?.role || 'Submissive';
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Update user role
  const updateUserRole = async (role: string) => {
    if (!user) return { error: { message: 'No user logged in' } };
    
    try {
      // Ensure valid role format
      const formattedRole = role.toLowerCase();
      
      const { error } = await supabase.auth.updateUser({
        data: { 
          role: formattedRole 
        }
      });
      
      if (error) {
        console.error('Error updating user role in auth:', error);
        toast({
          title: 'Error updating role',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      // Also update in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: formattedRole
        }, { onConflict: 'user_id' });
      
      if (roleError) {
        console.error('Error updating user role in table:', roleError);
        return { error: roleError };
      }
      
      // Update local user object
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          role: formattedRole
        }
      };
      setUser(updatedUser);
      
      toast({
        title: 'Role updated',
        description: `Your role has been updated to ${role}`,
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during user role update:', error);
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
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
