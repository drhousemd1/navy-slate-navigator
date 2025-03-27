import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Lock, Copy, Check, Trash2, Unlink2, Camera, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useNavigate } from 'react-router-dom';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const Profile = () => {
  const { user, updateNickname, signOut, updateProfileImage } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [isEditingPassword, setIsEditingPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [role, setRole] = useState<string>('dominant');
  const [partnerLinkCode, setPartnerLinkCode] = useState<string>('');
  const [enteredPartnerCode, setEnteredPartnerCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLinkingPartner, setIsLinkingPartner] = useState<boolean>(false);
  const [linkedPartnerNickname, setLinkedPartnerNickname] = useState<string>('');
  const [isRoleLocked, setIsRoleLocked] = useState<boolean>(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'delete' | 'unlink';
  }>({
    isOpen: false,
    type: 'delete'
  });

  useEffect(() => {
    if (user) {
      const defaultNickname = user.email ? user.email.split('@')[0] : 'User';
      
      const userNickname = user.user_metadata?.nickname || defaultNickname;
      setNickname(userNickname);
      
      setEmail(user.email || '');
      
      if (user.user_metadata?.role) {
        setRole(user.user_metadata.role);
      }
      
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('partner_link_code, linked_partner_id, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.partner_link_code) {
        setPartnerLinkCode(data.partner_link_code);
      }
      
      if (data?.avatar_url) {
        setProfileImageUrl(data.avatar_url);
      }
      
      if (data?.linked_partner_id) {
        setIsRoleLocked(true);
        
        const { data: partnerData, error: partnerError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.linked_partner_id)
          .single();
          
        if (partnerError) throw partnerError;
        
        if (partnerData) {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
            partnerData.id
          );
          
          if (!userError && userData?.user) {
            const partnerNickname = userData.user.user_metadata?.nickname || 'Partner';
            setLinkedPartnerNickname(partnerNickname);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
    }
  };

  const handleProfileImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      // Create a storage bucket for profile images if it doesn't exist
      const fileName = `${user.id}-${Date.now()}`;
      const filePath = `${fileName}`;
      
      // Upload the file
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;
      
      // Update the profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update the local state
      setProfileImageUrl(avatarUrl);
      
      // Update the user metadata in the Auth context
      updateProfileImage(avatarUrl);
      
      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was an error uploading your profile image.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditNickname = () => {
    setIsEditingNickname(!isEditingNickname);
  };
  
  const handleEditEmailToggle = () => {
    setIsEditingEmail(!isEditingEmail);
  };
  
  const handleEditPasswordToggle = () => {
    setIsEditingPassword(!isEditingPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      toast({
        title: "Nickname required",
        description: "Please enter a valid nickname.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nickname }
      });

      if (error) throw error;

      if (updateNickname) {
        updateNickname(nickname);
      }

      toast({
        title: "Profile updated",
        description: "Your nickname has been updated successfully.",
      });
      setIsEditingNickname(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your nickname.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveEmail = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });

      if (error) throw error;

      toast({
        title: "Email update initiated",
        description: "A confirmation email has been sent. Please check your inbox to complete the email change.",
      });
      setIsEditingEmail(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSavePassword = async () => {
    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newPassword) {
      toast({
        title: "New password required",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error("Current password is incorrect");
      }
      
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      setIsEditingPassword(false);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (value: string) => {
    if (!value || value === role || isRoleLocked) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { role: value }
      });

      if (error) throw error;

      setRole(value);
      toast({
        title: "Role updated",
        description: `Your role has been updated to ${value}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your role.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateLinkCode = async (partnerRole: string) => {
    if (isRoleLocked) {
      toast({
        title: "Role locked",
        description: "Your role is locked because you are already linked with a partner.",
        variant: "destructive",
      });
      return;
    }
    
    const userRole = partnerRole === 'dominant' ? 'submissive' : 'dominant';
    
    if (role !== userRole) {
      const { error: roleError } = await supabase.auth.updateUser({
        data: { role: userRole }
      });
      
      if (roleError) {
        toast({
          title: "Role update failed",
          description: roleError.message || "Could not update your role.",
          variant: "destructive",
        });
        return;
      }
      
      setRole(userRole);
    }
    
    setIsLoading(true);
    try {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${randomPart}-${partnerRole.substring(0, 3).toUpperCase()}-${user?.id.substring(0, 8)}`;
      
      const { error } = await supabase
        .from('profiles')
        .update({ partner_link_code: code })
        .eq('id', user?.id);
        
      if (error) throw error;
      
      setPartnerLinkCode(code);
      toast({
        title: "Code generated",
        description: `Share this code with your ${partnerRole} partner to link accounts.`,
      });
    } catch (error: any) {
      toast({
        title: "Error generating code",
        description: error.message || "There was an error generating your partner code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(partnerLinkCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    
    toast({
      title: "Code copied",
      description: "The link code has been copied to your clipboard.",
    });
  };
  
  const linkPartner = async () => {
    if (!enteredPartnerCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter your partner's link code.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLinkingPartner(true);
    try {
      const codeParts = enteredPartnerCode.split('-');
      if (codeParts.length !== 3) {
        throw new Error("Invalid partner code format.");
      }
      
      const requiredRole = codeParts[1].toLowerCase() === 'dom' ? 'dominant' : 'submissive';
      
      if (requiredRole === role) {
        throw new Error(`This code is meant for a ${requiredRole} user, but you are also a ${role}. Partners must have different roles.`);
      }
      
      const { data: partnerData, error: partnerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('partner_link_code', enteredPartnerCode.trim())
        .single();
      
      if (partnerError || !partnerData) {
        throw new Error("Invalid partner code. Please check and try again.");
      }
      
      if (partnerData.id === user?.id) {
        throw new Error("You cannot link to your own account.");
      }
      
      const { data: partnerCheck, error: checkError } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', partnerData.id)
        .single();
        
      if (!checkError && partnerCheck?.linked_partner_id) {
        throw new Error("This user is already linked with another partner.");
      }
      
      const { error: roleError } = await supabase.auth.updateUser({
        data: { role: requiredRole }
      });
      
      if (roleError) {
        throw new Error("Failed to update your role: " + roleError.message);
      }
      
      setRole(requiredRole);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          linked_partner_id: partnerData.id,
          partner_link_code: null
        })
        .eq('id', user?.id);
        
      if (updateError) throw updateError;
      
      const { error: partnerUpdateError } = await supabase
        .from('profiles')
        .update({ 
          linked_partner_id: user?.id,
          partner_link_code: null
        })
        .eq('id', partnerData.id);
        
      if (partnerUpdateError) throw partnerUpdateError;
      
      setEnteredPartnerCode('');
      setIsRoleLocked(true);
      
      await fetchUserProfile();
      
      toast({
        title: "Accounts linked!",
        description: `Your account has been successfully linked with your partner. Your role is now locked as ${requiredRole}.`,
      });
    } catch (error: any) {
      toast({
        title: "Link failed",
        description: error.message || "There was an error linking your account.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingPartner(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(
        user?.id as string
      );

      if (authError) throw authError;

      await signOut();
      
      navigate('/auth');

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "There was an error deleting your account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unlinkPartner = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user?.id)
        .single();
        
      const partnerId = data?.linked_partner_id;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ linked_partner_id: null })
        .eq('id', user?.id);
        
      if (updateError) throw updateError;
      
      if (partnerId) {
        const { error: partnerUpdateError } = await supabase
          .from('profiles')
          .update({ linked_partner_id: null })
          .eq('id', partnerId);
          
        if (partnerUpdateError) throw partnerUpdateError;
      }
      
      setLinkedPartnerNickname('');
      setIsRoleLocked(false);
      
      toast({
        title: "Accounts unlinked",
        description: "Your account is no longer linked with your partner. You can now change your role.",
      });
    } catch (error: any) {
      toast({
        title: "Unlink failed",
        description: error.message || "There was an error unlinking your account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDialogConfig({ isOpen: false, type: 'unlink' });
    }
  };

  const openDeleteDialog = () => {
    setDialogConfig({ isOpen: true, type: 'delete' });
  };

  const openUnlinkDialog = () => {
    setDialogConfig({ isOpen: true, type: 'unlink' });
  };

  const handleDialogClose = () => {
    setDialogConfig({ ...dialogConfig, isOpen: false });
  };

  const handleDialogConfirm = () => {
    if (dialogConfig.type === 'delete') {
      handleDeleteAccount();
    } else {
      unlinkPartner();
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-bold text-white mb-4">Profile</h1>
        
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-light-navy cursor-pointer" onClick={handleProfileImageClick}>
              <AvatarImage src={profileImageUrl} alt={nickname} />
              <AvatarFallback className="bg-light-navy text-nav-active text-xl">
                {nickname ? nickname.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div 
              className="absolute bottom-0 right-0 bg-cyan-600 hover:bg-cyan-700 rounded-full p-1 cursor-pointer"
              onClick={handleProfileImageClick}
            >
              <Pencil className="h-4 w-4 text-white" />
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />
          </div>
          {isUploadingImage && (
            <p className="text-white text-sm mt-2">Uploading...</p>
          )}
        </div>
        
        <div className="bg-navy py-2 px-4 rounded-lg border border-light-navy mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Nickname:</label>
              {!isEditingNickname && (
                <p className="text-white">{nickname}</p>
              )}
            </div>
            {!isEditingNickname && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white"
                onClick={handleEditNickname}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isEditingNickname && (
            <div className="flex gap-2 mt-2">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-light-navy text-white border-light-navy"
                placeholder="Enter nickname"
              />
              <Button 
                onClick={handleSaveNickname} 
                disabled={isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Save
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleEditNickname}
                className="text-white"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-navy py-2 px-4 rounded-lg border border-light-navy mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Email:</label>
              {!isEditingEmail && (
                <p className="text-white">{email}</p>
              )}
            </div>
            {!isEditingEmail && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white"
                onClick={handleEditEmailToggle}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isEditingEmail && (
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-light-navy text-white border-light-navy"
                placeholder="Enter email"
              />
              <Button 
                onClick={handleSaveEmail} 
                disabled={isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Save
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleEditEmailToggle}
                className="text-white"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-navy py-2 px-4 rounded-lg border border-light-navy mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Password:</label>
              {!isEditingPassword && (
                <p className="text-white">••••••••</p>
              )}
            </div>
            {!isEditingPassword && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white"
                onClick={handleEditPasswordToggle}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isEditingPassword && (
            <div className="flex flex-col gap-2 mt-2">
              <div>
                <label className="text-white text-sm mb-1 block">Current Password:</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-light-navy text-white border-light-navy"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="text-white text-sm mb-1 block">New Password:</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-light-navy text-white border-light-navy"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="text-white text-sm mb-1 block">Confirm New Password:</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-light-navy text-white border-light-navy"
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex gap-2 mt-2">
                <Button 
                  onClick={handleSavePassword} 
                  disabled={isLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Save
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleEditPasswordToggle}
                  className="text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-navy py-2 px-4 rounded-lg border border-light-navy mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Role:</label>
              <div className="w-full max-w-xs">
                <ToggleGroup 
                  type="single" 
                  value={role} 
                  onValueChange={handleRoleChange}
                  className="bg-light-navy p-1 rounded-md"
                  disabled={isLoading || isRoleLocked}
                >
                  <ToggleGroupItem 
                    value="dominant" 
                    className="w-full data-[state=on]:bg-red-500 data-[state=on]:text-white"
                  >
                    Dominant
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="submissive" 
                    className="w-full data-[state=on]:bg-purple-600 data-[state=on]:text-white"
                  >
                    Submissive
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            {isRoleLocked && (
              <div className="flex items-center text-amber-400">
                <Lock className="h-4 w-4 mr-1" />
                <span className="text-xs">Locked</span>
              </div>
            )}
          </div>
          {isRoleLocked && (
            <p className="text-gray-400 text-xs mt-1">
              Your role is locked because you are linked with a partner.
            </p>
          )}
        </div>
        
        <div className="bg-navy py-4 px-4 rounded-lg border border-light-navy mb-3">
          <h2 className="text-white font-semibold mb-2">Link Partner</h2>
          
          {linkedPartnerNickname ? (
            <div className="space-y-3">
              <p className="text-white">
                You are linked with: <span className="font-semibold">{linkedPartnerNickname}</span>
              </p>
              <Button 
                variant="destructive" 
                onClick={openUnlinkDialog}
                disabled={isLoading}
                className="text-white"
              >
                <Unlink2 className="h-4 w-4 mr-2" />
                Unlink Partner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-white text-sm mb-2">Generate a linking code for your partner:</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {role === 'dominant' ? (
                    <Button 
                      onClick={() => generateLinkCode('submissive')} 
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Link a Submissive
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => generateLinkCode('dominant')} 
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Link a Dominant
                    </Button>
                  )}
                </div>
              </div>
              
              {partnerLinkCode && (
                <div>
                  <p className="text-white text-sm mb-1">Your link code:</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={partnerLinkCode}
                      readOnly
                      className="bg-light-navy text-white border-light-navy"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleCopyCode}
                      className="text-white"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Copy code and send to your partner. They must enter this code in their profile settings to link accounts.
                  </p>
                </div>
              )}
              
              <div className="pt-2 border-t border-light-navy mt-3">
                <p className="text-white text-sm mb-2">Enter your partner's code:</p>
                <div className="flex gap-2 items-center">
                  <Input
                    value={enteredPartnerCode}
                    onChange={(e) => setEnteredPartnerCode(e.target.value)}
                    placeholder="Enter partner code"
                    className="bg-light-navy text-white border-light-navy"
                  />
                  <Button 
                    onClick={linkPartner} 
                    disabled={isLinkingPartner || !enteredPartnerCode.trim()}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white whitespace-nowrap"
                  >
                    Link Account
                  </Button>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Entering this code will link your accounts and may change your role to match your partner's requirements.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-navy py-4 px-4 rounded-lg border border-light-navy mb-3">
          <h2 className="text-white font-semibold mb-4">Account Management</h2>
          
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-col">
              <Button 
                variant="destructive" 
                onClick={openUnlinkDialog}
                disabled={isLoading || !linkedPartnerNickname}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Unlink2 className="h-4 w-4" />
                Unlink Account
              </Button>
              {!linkedPartnerNickname && (
                <p className="text-gray-400 text-xs mt-1">You have no linked accounts</p>
              )}
            </div>
            
            <Button 
              variant="destructive" 
              onClick={openDeleteDialog}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
          
          <p className="text-gray-400 text-xs mt-3">
            Deleting your account will permanently remove all your data and cannot be undone.
          </p>
        </div>
      </div>
      
      <DeleteAccountDialog 
        isOpen={dialogConfig.isOpen}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
        type={dialogConfig.type}
      />
    </AppLayout>
  );
};

export default Profile;
