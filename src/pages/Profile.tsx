import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import DeleteAccountDialog from '@/components/profile/DeleteAccountDialog';
import DeleteAvatarDialog from '@/components/profile/DeleteAvatarDialog';

const ProfilePage: React.FC = () => {
  const { user, session } = useAuth(); // Removed methods that might not exist: , updateUserPassword, uploadAvatar, deleteAvatar, signOut, deleteUserAccount 
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeleteAvatarOpen, setIsDeleteAvatarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.user_metadata?.username || user.email || '');
      setAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (!newPassword) {
      toast({ title: 'Error', description: 'Password cannot be empty.', variant: 'destructive' });
      return;
    }
    try {
      // if (updateUserPassword) {
      //   await updateUserPassword(newPassword);
      //   toast({ title: 'Success', description: 'Password updated successfully.' });
      //   setNewPassword('');
      //   setConfirmPassword('');
      // } else {
      //   toast({ title: 'Error', description: 'Password update feature not available.', variant: 'destructive'});
      // }
      // Placeholder for Supabase direct call if updateUserPassword from context is unavailable
       const { error } = await supabase.auth.updateUser({ password: newPassword });
       if (error) throw error;
       toast({ title: 'Success', description: 'Password updated successfully.' });
       setNewPassword('');
       setConfirmPassword('');
    } catch (error: unknown) {
      toast({ title: 'Error updating password', description: getErrorMessage(error), variant: 'destructive' });
      logger.error('Error updating password:', getErrorMessage(error), error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // if (uploadAvatar) {
      //   const newAvatarUrl = await uploadAvatar(file);
      //   setAvatarUrl(newAvatarUrl);
      //   toast({ title: 'Success', description: 'Avatar updated successfully.' });
      // } else {
      //    toast({ title: 'Error', description: 'Avatar upload feature not available.', variant: 'destructive'});
      // }
      // Placeholder for direct Supabase storage interaction
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!publicUrlData) throw new Error("Could not get public URL for avatar.");
      
      const newAvatarPublicUrl = publicUrlData.publicUrl;

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarPublicUrl }
      });
      if (updateUserError) throw updateUserError;
      
      setAvatarUrl(newAvatarPublicUrl);
      toast({ title: 'Success', description: 'Avatar updated successfully.' });

    } catch (error: unknown) {
      toast({ title: 'Error uploading avatar', description: getErrorMessage(error), variant: 'destructive' });
      logger.error('Error uploading avatar:', getErrorMessage(error), error);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteAvatar = async () => {
    if (!user || !avatarUrl) return;
    try {
      // if (deleteAvatar) {
      //   await deleteAvatar();
      //   setAvatarUrl(null);
      //   toast({ title: 'Success', description: 'Avatar removed successfully.' });
      // } else {
      //   toast({ title: 'Error', description: 'Avatar deletion feature not available.', variant: 'destructive'});
      // }
      // Placeholder for direct Supabase storage interaction
      const fileName = avatarUrl.split('/').pop();
      if (fileName) {
        const { error: deleteStorageError } = await supabase.storage.from('avatars').remove([`avatars/${fileName}`]);
        // Log error but proceed to update user metadata to remove link
        if (deleteStorageError) logger.error('Error deleting avatar from storage:', getErrorMessage(deleteStorageError));
      }

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });
      if (updateUserError) throw updateUserError;

      setAvatarUrl(null);
      toast({ title: 'Success', description: 'Avatar removed successfully.' });
      setIsDeleteAvatarOpen(false);
    } catch (error: unknown) {
      toast({ title: 'Error removing avatar', description: getErrorMessage(error), variant: 'destructive' });
      logger.error('Error removing avatar:', getErrorMessage(error), error);
    }
  };

  const handleSignOut = async () => {
    try {
      // if (signOut) {
      //   await signOut();
      //   toast({ title: 'Signed Out', description: 'You have been signed out.' });
      //   // Navigation to login will be handled by AuthProvider or router
      // } else {
      //    toast({ title: 'Error', description: 'Sign out feature not available.', variant: 'destructive'});
      // }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: 'Signed Out', description: 'You have been signed out.' });

    } catch (error: unknown) {
      toast({ title: 'Error signing out', description: getErrorMessage(error), variant: 'destructive' });
      logger.error('Error signing out:', getErrorMessage(error), error);
    }
  };

  const handleDeleteAccount = async () => {
    // This is a sensitive operation and should ideally be handled by a Supabase Edge Function
    // to ensure all related user data is cleaned up properly.
    // Direct client-side deletion might leave orphaned data.
    // For now, assuming `deleteUserAccount` from context handles this server-side.
    try {
        // if (deleteUserAccount) {
        //   await deleteUserAccount();
        //   toast({ title: 'Account Deleted', description: 'Your account has been scheduled for deletion.' });
        //   // Navigation to login will be handled by AuthProvider or router
        // } else {
        //   toast({ title: 'Error', description: 'Account deletion feature not available.', variant: 'destructive'});
        // }
        // This is a placeholder. Actual user deletion should be a backend operation.
        // supabase.auth.signOut() is called, but actual deletion needs more.
        toast({ title: 'Account Deletion Requested', description: 'This functionality requires backend setup for full data removal. You will be signed out.', variant: 'default' });
        await supabase.auth.signOut();

        setIsDeleteAccountOpen(false);
    } catch (error: unknown) {
        toast({ title: 'Error Deleting Account', description: getErrorMessage(error), variant: 'destructive' });
        logger.error('Error deleting account:', getErrorMessage(error), error);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="p-4">Loading user profile...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-white">Profile</h1>

        <Card className="mb-8 bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Avatar className="h-16 w-16 mr-4">
                <AvatarImage src={avatarUrl || undefined} alt={username} />
                <AvatarFallback>{username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {username}
            </CardTitle>
            <CardDescription className="text-gray-400">Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="avatar" className="block text-sm font-medium text-gray-300 mb-1">Profile Picture</label>
              <Input id="avatar" type="file" onChange={handleAvatarUpload} disabled={uploading} className="bg-gray-700 border-gray-600 placeholder-gray-500 text-white" />
              {uploading && <p className="text-sm text-blue-400 mt-1">Uploading...</p>}
               {avatarUrl && (
                <Button variant="link" onClick={() => setIsDeleteAvatarOpen(true)} className="text-red-400 px-0 mt-1">
                  Remove Avatar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8 bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-gray-700 border-gray-600 placeholder-gray-500" />
            <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-gray-700 border-gray-600 placeholder-gray-500" />
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdatePassword} className="bg-blue-600 hover:bg-blue-700">Update Password</Button>
          </CardFooter>
        </Card>

        <Card className="bg-red-900/30 border-red-700 text-white">
            <CardHeader>
                <CardTitle className="text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Button variant="outline" onClick={handleSignOut} className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-600 hover:text-white">Sign Out</Button>
                <Button variant="destructive" onClick={() => setIsDeleteAccountOpen(true)} className="w-full bg-red-600 hover:bg-red-700">Delete Account</Button>
            </CardContent>
        </Card>
      </div>
      <DeleteAccountDialog
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      <DeleteAvatarDialog
        isOpen={isDeleteAvatarOpen}
        onClose={() => setIsDeleteAvatarOpen(false)}
        onConfirm={handleDeleteAvatar}
      />
    </AppLayout>
  );
};

export default ProfilePage;
