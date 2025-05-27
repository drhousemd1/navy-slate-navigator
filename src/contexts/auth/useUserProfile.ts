
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadFile, deleteFiles } from '@/data/storageService';
import { logger } from '@/lib/logger'; // Added logger import

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
          logger.error('Error updating user role:', error); // Replaced console.error
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
        logger.error('Exception during user role update:', error); // Replaced console.error
        toast({
          title: 'Error updating role',
          description: error.message,
          variant: 'destructive',
        });
      }
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
      const { error } = await supabase.auth.updateUser({
        data: { 
          avatar_url: publicUrl 
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setProfileImageState(publicUrl);
      
      return publicUrl;
    } catch (error: any) {
      logger.error('Error uploading profile image:', error); // Replaced console.error
      toast({
        title: 'Error updating profile image',
        description: error.message,
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
        logger.debug('No avatar to delete'); // Replaced console.log
        return;
      }
      
      // Extract the file path from the URL
      const urlParts = currentAvatarUrl.split('/');
      const filePath = urlParts[urlParts.length - 2] + '/' + urlParts[urlParts.length - 1];
      
      // Delete the file from storage
      await deleteFiles('avatars', [filePath]);
      
      // Update user metadata to remove the avatar URL
      const { error } = await supabase.auth.updateUser({
        data: { 
          avatar_url: null 
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setProfileImageState(null);
      
    } catch (error: any) {
      logger.error('Error deleting profile image:', error); // Replaced console.error
      toast({
        title: 'Error deleting profile image',
        description: error.message,
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
