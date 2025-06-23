import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadFile, deleteFiles } from '@/data/storageService';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { ProfileRole } from '@/types/profile';

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

  // Renamed function: Update user profile image state locally
  const setProfileImageState = (imageUrl: string | null) => { // Allow null for deletion
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          avatar_url: imageUrl // Use imageUrl, which can be null
        }
      };
      setUser(updatedUser);
    }
  };

  // Get user nickname
  const getNickname = (): string | null => { // Changed return type to string | null
    if (!user) return null; // Changed from 'Guest' to null
    
    if (user.user_metadata?.nickname) {
      return user.user_metadata.nickname;
    }
    
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      // Ensure emailPrefix is not empty, otherwise fall back to 'User'
      return emailPrefix.length > 0 ? emailPrefix : 'User'; 
    }
    
    return 'User'; // Fallback if user exists but no nickname or email
  };

  // Get user profile image
  const getProfileImage = (): string => {
    if (!user) return '';
    return user.user_metadata?.avatar_url || '';
  };

  // Get user role from profiles table
  const getUserRole = async (): Promise<ProfileRole | null> => {
    if (!user) return null;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('Error fetching user role from profiles:', error);
        return null;
      }

      return profile?.role as ProfileRole || null;
    } catch (error) {
      logger.error('Exception fetching user role:', error);
      return null;
    }
  };

  // Update user role in profiles table (not user metadata)
  const updateUserRole = async (role: ProfileRole) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);
        
      if (error) {
        logger.error('Error updating user role in profiles:', error);
        toast({
          title: 'Error updating role',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      
      // Also update user metadata for immediate UI feedback
      const { error: authError } = await supabase.auth.updateUser({
        data: { role }
      });
      
      if (authError) {
        logger.warn('Error updating auth metadata (non-critical):', authError);
      }
      
      // Update local user state
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
    } catch (error: unknown) {
      logger.error('Exception during user role update:', error);
      toast({
        title: 'Error updating role',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  // Upload profile image and update user metadata
  const uploadProfileImageAndUpdateState = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const userId = user.id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload the file to storage
      const { publicUrl } = await uploadFile('avatars', filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL after upload');
      }
      
      // Update user metadata with the new avatar URL
      const { error: updateUserError } = await supabase.auth.updateUser({ // Renamed error to avoid conflict
        data: { 
          avatar_url: publicUrl 
        }
      });
      
      if (updateUserError) { // Check renamed error
        throw updateUserError;
      }
      
      // Update local state
      setProfileImageState(publicUrl);
      
      return publicUrl;
    } catch (error: unknown) { // Changed from any to unknown
      logger.error('Error uploading profile image:', error);
      toast({
        title: 'Error updating profile image',
        description: getErrorMessage(error), // Use getErrorMessage
        variant: 'destructive',
      });
      return null;
    }
  };
  
  // Delete user profile image
  const deleteUserProfileImage = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const currentAvatarUrl = getProfileImage();
      
      if (!currentAvatarUrl) {
        logger.debug('No avatar to delete');
        return;
      }
      
      // Extract the file path from the URL
      const urlParts = currentAvatarUrl.split('/');
      // Assuming the path is always the last two parts like "avatars/filename.ext"
      const filePath = urlParts.slice(-2).join('/');
      
      // Delete the file from storage
      await deleteFiles('avatars', [filePath]);
      
      // Update user metadata to remove the avatar URL
      const { error: updateUserError } = await supabase.auth.updateUser({ // Renamed error
        data: { 
          avatar_url: null 
        }
      });
      
      if (updateUserError) { // Check renamed error
        throw updateUserError;
      }
      
      // Update local state
      setProfileImageState(null);
      
    } catch (error: unknown) { // Changed from any to unknown
      logger.error('Error deleting profile image:', error);
      toast({
        title: 'Error deleting profile image',
        description: getErrorMessage(error), // Use getErrorMessage
        variant: 'destructive',
      });
    }
  };

  return {
    updateNickname,
    getNickname,
    setProfileImageState,
    getProfileImage,
    getUserRole,
    updateUserRole,
    uploadProfileImageAndUpdateState,
    deleteUserProfileImage
  };
}
