import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Camera, Trash2, LogOut } from 'lucide-react';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { DeleteAvatarDialog } from '@/components/profile/DeleteAvatarDialog';
import PartnerLinkingSection from '@/components/profile/PartnerLinkingSection';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const Profile: React.FC = () => {
  const { 
    user, 
    getNickname, 
    updateNickname, 
    getProfileImage, 
    uploadProfileImageAndUpdateState, 
    deleteUserProfileImage, 
    signOut,
    updateUserRole,
    deleteAccount 
  } = useAuth();
  const [nickname, setNickname] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newProfileImageFile, setNewProfileImageFile] = useState<File | null>(null);
  const [loadingNickname, setLoadingNickname] = useState(false);
  const [loadingProfileImage, setLoadingProfileImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeleteAvatarDialogOpen, setIsDeleteAvatarDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const currentNickname = getNickname();
      logger.debug('Profile Page: Current nickname from context:', currentNickname);
      setNickname(currentNickname || '');
      
      const currentImage = getProfileImage();
      logger.debug('Profile Page: Current profile image from context:', currentImage);
      setProfileImage(currentImage);

      const role = user.user_metadata?.role || 'Not Set';
      setCurrentRole(role);
      logger.debug('Profile Page: Current user role from metadata:', role);
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error updating nickname:', errorMessage);
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
      // Use the new function for uploading
      const newImageUrl = await uploadProfileImageAndUpdateState(newProfileImageFile);
      if (newImageUrl) {
        setProfileImage(newImageUrl); 
        setNewProfileImageFile(null); 
        toast({ title: 'Success', description: 'Profile image updated successfully.' });
      } else {
        logger.warn('Profile Page: uploadProfileImageAndUpdateState did not return a new image URL as expected, but did not throw.');
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error uploading profile image:', errorMessage);
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoadingProfileImage(false);
    }
  };
  
  const handleDeleteAvatar = async () => {
    if (!user) return;
    setLoadingProfileImage(true); 
    setError(null);
    try {
      // Use the new function for deleting
      await deleteUserProfileImage(); 
      setProfileImage(null); 
      setNewProfileImageFile(null); 
      toast({ title: 'Success', description: 'Profile image removed.' });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error deleting profile image:', errorMessage);
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoadingProfileImage(false);
      setIsDeleteAvatarDialogOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    logger.debug('Profile Page: User signed out. Cache purging handled by AuthContext.');
  };

  const handleDeleteAccount = async () => {
    if (!user || !deleteAccount) return; // Check if deleteAccount is available
    try {
      await deleteAccount();
      toast({ title: "Account Deletion Initiated", description: "Your account is scheduled for deletion. You will be logged out." });
      // signOut is called within deleteAccount if successful, or handled by onAuthStateChange
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error deleting account:', errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsDeleteAccountDialogOpen(false);
    }
  };

  const handleRoleChange = async (newRole: 'sub' | 'dom') => {
    if (!user) return;
    try {
      await updateUserRole(newRole);
      setCurrentRole(newRole); // Update local state to reflect change immediately
      toast({ title: 'Success', description: `Role updated to ${newRole}.` });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error updating role:', errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-white">Loading user profile...</p>
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
                variant={currentRole === 'sub' ? "default" : "ghost"}
                className={currentRole === 'sub' ? "bg-cyan-600 hover:bg-cyan-700" : "bg-gray-600 text-black hover:bg-gray-500"}
              >
                Set as Submissive
              </Button>
              <Button 
                onClick={() => handleRoleChange('dom')} 
                variant={currentRole === 'dom' ? "default" : "ghost"}
                className={currentRole === 'dom' ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 text-black hover:bg-gray-500"}
              >
                Set as Dominant
              </Button>
            </div>
          </div>

          {/* Partner Linking Section */}
          <PartnerLinkingSection />
          
          {/* Actions Section */}
          <div className="space-y-4 border-t border-light-navy pt-8 mt-8">
            <Button onClick={handleLogout} variant="outline" className="w-full border-gray-600 hover:bg-gray-700 flex items-center">
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
            <Button onClick={() => setIsDeleteAccountDialogOpen(true)} variant="destructive" className="w-full flex items-center" disabled={!deleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </div>
      </div>
      <DeleteAccountDialog
        isOpen={isDeleteAccountDialogOpen}
        onClose={() => setIsDeleteAccountDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        type="delete"
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
