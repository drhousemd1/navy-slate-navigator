
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadFile, deleteFiles } from '@/data/storageService';
import { logger } from '@/lib/logger';

export function useUserProfile(user: User | null, setUser: (user: User | null) => void) {
  // Update user nickname
  const updateNickname = async (nickname: string) => { // Made async to handle Supabase update
    if (user) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          data: { nickname } // Ensure 'nickname' is a valid field in user_metadata
        });

        if (error) {
          logger.error('Error updating nickname in Supabase:', error);
          toast({
            title: 'Error updating nickname',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        // Supabase's updateUser returns the updated user object in `data.user`
        if (data.user) {
          setUser(data.user); // Update local user state with the full updated user from Supabase
          toast({
            title: 'Nickname updated',
            description: `Your nickname has been updated to ${nickname}`,
          });
        } else {
          // Fallback if data.user is not returned, update locally (less ideal)
          const updatedUser = {
            ...user,
            user_metadata: {
              ...(user.user_metadata || {}),
              nickname
            }
          };
          setUser(updatedUser);
          toast({
            title: 'Nickname updated (local)',
            description: `Your nickname has been updated to ${nickname}`,
          });
        }
      } catch (error: any) {
        logger.error('Exception during nickname update:', error);
        toast({
          title: 'Error updating nickname',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  // Renamed function: Update user profile image state locally
  const setProfileImageState = (imageUrl: string | null) => {
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          avatar_url: imageUrl
        }
      };
      setUser(updatedUser); // This updates the local user state, not Supabase directly here.
                           // The actual Supabase update for avatar_url happens in uploadProfileImageAndUpdateState
    }
  };

  // Get user nickname
  const getNickname = (): string => {
    if (!user) return 'Guest';
    
    if (user.user_metadata?.nickname) {
      return user.user_metadata.nickname;
    }
    
    if (user.email) {
      // Ensure email is not undefined before splitting
      return user.email.split('@')[0] || 'User'; // Fallback if split results in empty string
    }
    
    return 'User';
  };

  // Get user profile image
  const getProfileImage = (): string => {
    if (!user) return ''; // Return empty string for no user
    return user.user_metadata?.avatar_url || ''; // Return empty string if avatar_url is null/undefined
  };

  // Get user role (from user_metadata)
  const getUserRole = (): string => {
    if (!user) return 'Submissive'; // Default role
    
    // Get the role from metadata and ensure it's properly capitalized
    const role = user.user_metadata?.role as string | undefined; // Explicitly type role
    
    if (role) {
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
    
    return 'Submissive'; // Default if role not in metadata
  };

  // Update user role (in user_metadata)
  const updateUserRole = async (role: string) => {
    if (user) {
      try {
        // Ensure role is one of the predefined AppRole types if applicable, or handle validation
        const { data, error } = await supabase.auth.updateUser({
          data: { 
            role // This updates user_metadata.role
          }
        });
        
        if (error) {
          logger.error('Error updating user role:', error);
          toast({
            title: 'Error updating role',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }
        
        // `data.user` contains the updated user object
        if (data.user) {
            setUser(data.user); // Update local state with the user object from Supabase
        } else {
            // Fallback: if Supabase doesn't return the user, update locally (less ideal)
            const updatedUser = {
              ...user,
              user_metadata: {
                ...(user.user_metadata || {}),
                role
              }
            };
            setUser(updatedUser);
        }
        
        toast({
          title: 'Role updated',
          description: `Your role has been updated to ${role}`,
        });
      } catch (error: any) {
        logger.error('Exception during user role update:', error);
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
      // Bucket name should match your Supabase storage bucket for avatars
      const avatarBucket = 'avatars'; 
      const filePath = `${fileName}`; // Path within the bucket

      // Check if bucket 'avatars' exists, create if not - This should ideally be done once,
      // or ensured it exists. For robustness, a check can be added if permissions allow.
      // For now, assuming 'avatars' bucket exists.

      // Upload the file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(avatarBucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Overwrite if file with same name exists
        });

      if (uploadError) {
        logger.error('Error uploading to Supabase Storage:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(avatarBucket)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        logger.error('Failed to get public URL after upload for path:', filePath);
        throw new Error('Failed to get public URL after upload');
      }
      const publicUrl = publicUrlData.publicUrl;
      
      // Update user metadata with the new avatar URL
      const { data: userUpdateData, error: userUpdateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: publicUrl 
        }
      });
      
      if (userUpdateError) {
        logger.error('Error updating user metadata with avatar_url:', userUpdateError);
        // Attempt to delete the uploaded image if user update fails to prevent orphaned files
        await supabase.storage.from(avatarBucket).remove([filePath]);
        throw userUpdateError;
      }
      
      // Update local state with the user object from Supabase response
      if (userUpdateData.user) {
        setUser(userUpdateData.user);
      } else {
        // Fallback: update local state if Supabase doesn't return user (less ideal)
        setProfileImageState(publicUrl); 
      }
      
      toast({ title: "Profile Image Updated", description: "Your new avatar is now active." });
      return publicUrl;
    } catch (error: any) {
      logger.error('Error uploading profile image:', error);
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
        logger.log('No avatar to delete');
        return;
      }
      
      // Extract the file path from the URL
      // Assuming URL format like: .../storage/v1/object/public/avatars/filename.ext
      const urlParts = new URL(currentAvatarUrl);
      const pathSegments = urlParts.pathname.split('/');
      // The actual file path in the bucket is usually the last segment or last few segments
      // For 'avatars/filename.ext', it would be `pathSegments.slice(-2).join('/')` if bucket name is in URL
      // If public URL is just `.../avatars/actualfile.png` then last segment is enough.
      // Let's assume the filePath in storage is just the filename if bucket is 'avatars'
      const fileName = pathSegments[pathSegments.length - 1];
      const avatarBucket = 'avatars';
      
      // Delete the file from storage
      const { error: deleteError } = await supabase.storage
        .from(avatarBucket)
        .remove([fileName]); // Pass an array of file paths

      if (deleteError) {
        logger.error('Error deleting file from Supabase Storage:', deleteError);
        throw deleteError;
      }
      
      // Update user metadata to remove the avatar URL
      const { data: userUpdateData, error: userUpdateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: null 
        }
      });
      
      if (userUpdateError) {
        logger.error('Error updating user metadata (removing avatar_url):', userUpdateError);
        throw userUpdateError;
      }
      
      // Update local state
      if (userUpdateData.user) {
        setUser(userUpdateData.user);
      } else {
        setProfileImageState(null); // Fallback
      }
      
      toast({ title: "Profile Image Removed", description: "Your avatar has been deleted." });
      
    } catch (error: any) {
      logger.error('Error deleting profile image:', error);
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
    setProfileImageState, // This locally sets user state, Supabase update is separate
    getProfileImage,
    getUserRole,
    updateUserRole,
    uploadProfileImageAndUpdateState, // This handles Supabase upload + user metadata update
    deleteUserProfileImage // This handles Supabase delete + user metadata update
  };
}
