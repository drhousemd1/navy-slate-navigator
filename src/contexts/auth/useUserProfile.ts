
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { ProfileRole } from '@/types/profile';
import { useQueryClient } from '@tanstack/react-query';
import { handleAvatarImageUpload } from '@/utils/image/avatarIntegration';

export function useUserProfile(user: User | null, setUser: (user: User | null) => void) {
  const queryClient = useQueryClient();

  // Update user nickname in both user_metadata and profiles table
  const updateNickname = async (nickname: string) => {
    if (!user) return;
    
    try {
      // Update user metadata (for current user display)
      const { error: authError } = await supabase.auth.updateUser({
        data: { nickname }
      });
      
      if (authError) {
        throw authError;
      }
      
      // Update profiles table (for partner display)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user.id);
        
      if (profileError) {
        logger.warn('Error updating nickname in profiles table:', profileError);
        // Don't throw here as auth update succeeded
      }
      
      // Update local user state
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          nickname
        }
      };
      setUser(updatedUser);
      
      // Invalidate partner profile cache so partner sees the updated nickname
      queryClient.invalidateQueries({ queryKey: ['partner-profile'] });
      
      toast({
        title: 'Nickname updated',
        description: 'Your nickname has been updated successfully',
      });
    } catch (error: unknown) {
      logger.error('Error updating nickname:', error);
      toast({
        title: 'Error updating nickname',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      throw error;
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

  // Synchronous role getter for UI display only (NEVER use for business logic)
  const getUserRoleSync = (): string => {
    if (!user) return '';
    return user.user_metadata?.role || '';
  };

  // Get user role from profiles table (async - source of truth)
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
      
      // Invalidate partner profile cache so partner sees the role update
      queryClient.invalidateQueries({ queryKey: ['partner-profile'] });
      
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

  // Upload profile image and update user metadata (now using base64)
  const uploadProfileImageAndUpdateState = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    try {
      // Compress image and convert to base64
      const result = await handleAvatarImageUpload(file);
      
      if (!result) {
        throw new Error('Failed to process image');
      }
      
      const { base64String } = result;
      
      // Update user metadata with the base64 string
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: base64String 
        }
      });
      
      if (updateUserError) {
        throw updateUserError;
      }
      
      // Update profiles table with the base64 string (for partner display)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: base64String })
        .eq('id', user.id);
        
      if (profileError) {
        logger.warn('Error updating avatar_url in profiles table:', profileError);
        // Don't throw here as auth update succeeded
      }
      
      // Update local state
      setProfileImageState(base64String);
      
      // Invalidate partner profile cache so partner sees the updated avatar
      queryClient.invalidateQueries({ queryKey: ['partner-profile'] });
      
      return base64String;
    } catch (error: unknown) {
      logger.error('Error uploading profile image:', error);
      toast({
        title: 'Error updating profile image',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return null;
    }
  };
  
  // Delete user profile image (now just removes the base64 data)
  const deleteUserProfileImage = async (): Promise<void> => {
    if (!user) return;
    
    try {
      // Update user metadata to remove the avatar
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: null 
        }
      });
      
      if (updateUserError) {
        throw updateUserError;
      }
      
      // Update profiles table to remove the avatar (for partner display)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
        
      if (profileError) {
        logger.warn('Error removing avatar_url from profiles table:', profileError);
        // Don't throw here as auth update succeeded
      }
      
      // Update local state
      setProfileImageState(null);
      
      // Invalidate partner profile cache so partner sees the avatar removal
      queryClient.invalidateQueries({ queryKey: ['partner-profile'] });
      
    } catch (error: unknown) {
      logger.error('Error deleting profile image:', error);
      toast({
        title: 'Error deleting profile image',
        description: getErrorMessage(error),
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
    getUserRoleSync,
    updateUserRole,
    uploadProfileImageAndUpdateState,
    deleteUserProfileImage
  };
}
