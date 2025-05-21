import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth'; // Changed import path
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Camera, Trash2, LogOut } from 'lucide-react';
import DeleteAccountDialog from '@/components/profile/DeleteAccountDialog';
import DeleteAvatarDialog from '@/components/profile/DeleteAvatarDialog';
// import { useQueryClient } from '@tanstack/react-query'; // No longer needed for purge
// import { purgeQueryCache } from '@/lib/react-query-config'; // No longer needed here

const Profile: React.FC = () => {
  const { 
    user, 
    getNickname, 
    updateNickname, 
    getProfileImage, 
    updateProfileImage, 
    signOut,
    updateUserRole // Added updateUserRole
  } = useAuth();
  const [nickname, setNickname] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newProfileImageFile, setNewProfileImageFile] = useState<File | null>(null);
  const [loadingNickname, setLoadingNickname] = useState(false);
  const [loadingProfileImage, setLoadingProfileImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeleteAvatarDialogOpen, setIsDeleteAvatarDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null); // State for current role
  // const queryClient = useQueryClient(); // No longer needed

  useEffect(() => {
    if (user) {
      const currentNickname = getNickname();
      console.log('Profile Page: Current nickname from context:', currentNickname);
      setNickname(currentNickname || '');
      
      const currentImage = getProfileImage();
      console.log('Profile Page: Current profile image from context:', currentImage);
      setProfileImage(currentImage);

      // Fetch and set the current user role
      const role = user.user_metadata?.role || 'Not Set'; // Adjust based on actual metadata structure
      setCurrentRole(role);
      console.log('Profile Page: Current user role from metadata:', role);

    }
  }, [user, getNickname, getProfileImage]);

  const handleNicknameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nickname.trim()) {
      setError('Nickname cannot be empty.');
      return;
    }
    setLoadingNickname(true);
    setError(null);
    try {
      await updateNickname(nickname.trim());
      toast({ title: 'Success', description: 'Nickname updated successfully.' });
    } catch (err: any) {
      console.error('Error updating nickname:', err);
      setError(err.message || 'Failed to update nickname.');
      toast({ title: 'Error', description: err.message || 'Failed to update nickname.', variant: 'destructive' });
    } finally {
      setLoadingNickname(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewProfileImageFile(file);
      // Preview image
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageUpload = async () => {
    if (!user || !newProfileImageFile) return;
    setLoadingProfileImage(true);
    setError(null);
    try {
      const newImageUrl = await updateProfileImage(newProfileImageFile);
      if (newImageUrl) {
        setProfileImage(newImageUrl); // Update local state with the URL from context
        setNewProfileImageFile(null); // Clear the file input state
        toast({ title: 'Success', description: 'Profile image updated successfully.' });
      } else {
        throw new Error("Failed to get new image URL after upload.");
      }
    } catch (err: any) {
      console.error('Error uploading profile image:', err);
      setError(err.message || 'Failed to upload profile image.');
      toast({ title: 'Error', description: err.message || 'Failed to upload profile image.', variant: 'destructive' });
    } finally {
      setLoadingProfileImage(false);
    }
  };
  
  const handleDeleteAvatar = async () => {
    if (!user) return;
    setLoadingProfileImage(true); // Reuse for loading state
    setError(null);
    try {
      // Call updateProfileImage with null to signify deletion
      await updateProfileImage(null); 
      setProfileImage(null); // Clear local preview
      setNewProfileImageFile(null); // Clear any staged file
      toast({ title: 'Success', description: 'Profile image removed.' });
    } catch (err: any)      {
      console.error('Error deleting profile image:', err);
      setError(err.message || 'Failed to delete profile image.');
      toast({ title: 'Error', description: err.message || 'Failed to delete profile image.', variant: 'destructive' });
    } finally {
      setLoadingProfileImage(false);
      setIsDeleteAvatarDialogOpen(false);
    }
  };

  const handleLogout = async () => {
    // Cache clearing is now handled by AuthContext on SIGNED_OUT event
    await signOut();
    // queryClient.clear(); // Removed: Handled by AuthContext
    // await purgeQueryCache(queryClient); // Removed: Handled by AuthContext
    console.log('Profile Page: User signed out. Cache purging handled by AuthContext.');
    // Navigation to /auth should happen automatically if AppRoutes protects this page
    // or by the AuthContext's listener if it handles global navigation post-logout.
    // If not, add navigate('/auth') here.
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      const { error: deleteAuthUserError } = await supabase.rpc('delete_user_account');

      if (deleteAuthUserError) {
        throw deleteAuthUserError;
      }
      
      toast({ title: "Account Deletion Initiated", description: "Your account is scheduled for deletion. You will be logged out." });
      
      // It's important to sign out the user locally after initiating deletion.
      // The actual user deletion in Supabase Auth might be asynchronous or handled by the trigger.
      await signOut(); 
      // Navigation will be handled by AuthContext or protected routes
      
    } catch (err: any) {
      console.error('Error deleting account:', err);
      toast({ title: 'Error', description: err.message || 'Failed to delete account.', variant: 'destructive' });
    } finally {
      setIsDeleteAccountDialogOpen(false);
    }
  };

  const handleRoleChange = async (newRole: 'sub' | 'dom') => {
    if (!user) return;
    try {
      await updateUserRole(newRole); // Call the context function
      setCurrentRole(newRole); // Update local state
      toast({ title: 'Success', description: `Role updated to ${newRole}.` });
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast({ title: 'Error', description: err.message || 'Failed to update role.', variant: 'destructive' });
    }
  };
  
  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-white">Loading user profile...</p>
          {/* Or redirect to login: <Navigate to="/auth" replace /> */}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 text-white">
        <h1 className="text-3xl font-bold mb-8 text-center">Profile Settings</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="max-w-2xl mx-auto bg-dark-navy p-8 rounded-lg shadow-xl border border-light-navy">
          
          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <Avatar className="w-32 h-32 text-4xl border-2 border-cyan-500">
                {profileImage ? (
                  <AvatarImage src={profileImage} alt={nickname || user.email || 'User'} />
                ) : null }
                <AvatarFallback className="bg-light-navy text-cyan-300">
                  {nickname ? nickname.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="profileImageInput" className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </label>
              <input
                id="profileImageInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
              />
            </div>
            {newProfileImageFile && (
              <Button onClick={handleProfileImageUpload} className="mt-4 bg-cyan-600 hover:bg-cyan-700" disabled={loadingProfileImage}>
                {loadingProfileImage ? 'Uploading...' : 'Save New Image'}
              </Button>
            )}
            {profileImage && !newProfileImageFile && (
              <Button variant="ghost" onClick={() => setIsDeleteAvatarDialogOpen(true)} className="mt-2 text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4 mr-2" /> Remove Image
              </Button>
            )}
          </div>

          {/* Nickname Section */}
          <form onSubmit={handleNicknameChange} className="space-y-6 mb-8">
            <div>
              <Label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-1">
                Nickname
              </Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-navy border-light-navy focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter your nickname"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loadingNickname}>
              {loadingNickname ? 'Saving...' : 'Save Nickname'}
            </Button>
          </form>

          {/* Email Section (Read-only) */}
          <div className="mb-8">
            <Label className="block text-sm font-medium text-gray-300 mb-1">Email</Label>
            <p className="text-gray-400 bg-navy p-3 rounded border border-light-navy">{user.email}</p>
          </div>

          {/* Role Selection Section */}
          <div className="mb-8">
            <Label className="block text-sm font-medium text-gray-300 mb-1">Current Role</Label>
            <p className="text-gray-400 bg-navy p-3 rounded border border-light-navy capitalize mb-2">
              {currentRole || 'Not set'}
            </p>
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleRoleChange('sub')} 
                variant={currentRole === 'sub' ? "default" : "outline"}
                className={currentRole === 'sub' ? "bg-cyan-600 hover:bg-cyan-700" : "border-cyan-500 text-cyan-400 hover:bg-cyan-900/50"}
              >
                Set as Submissive
              </Button>
              <Button 
                onClick={() => handleRoleChange('dom')} 
                variant={currentRole === 'dom' ? "default" : "outline"}
                className={currentRole === 'dom' ? "bg-purple-600 hover:bg-purple-700" : "border-purple-500 text-purple-400 hover:bg-purple-900/50"}
              >
                Set as Dominant
              </Button>
            </div>
          </div>
          
          {/* Actions Section */}
          <div className="space-y-4 border-t border-light-navy pt-8 mt-8">
            <Button onClick={handleLogout} variant="outline" className="w-full border-gray-600 hover:bg-gray-700 flex items-center">
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
            <Button onClick={() => setIsDeleteAccountDialogOpen(true)} variant="destructive" className="w-full flex items-center">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </div>
      </div>
      <DeleteAccountDialog
        isOpen={isDeleteAccountDialogOpen}
        onClose={() => setIsDeleteAccountDialogOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      <DeleteAvatarDialog
        isOpen={isDeleteAvatarDialogOpen}
        onClose={() => setIsDeleteAvatarDialogOpen(false)}
        onConfirm={handleDeleteAvatar}
      />
    </AppLayout>
  );
};

export default Profile;
