import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const Profile = () => {
  const { user, updateNickname } = useAuth();
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

  useEffect(() => {
    if (user) {
      // Default to email username (part before @)
      const defaultNickname = user.email ? user.email.split('@')[0] : 'User';
      
      // Try to get the nickname from user metadata if it exists
      const userNickname = user.user_metadata?.nickname || defaultNickname;
      setNickname(userNickname);
      
      // Set email
      setEmail(user.email || '');
      
      // Set role from user metadata if it exists
      if (user.user_metadata?.role) {
        setRole(user.user_metadata.role);
      }
    }
  }, [user]);

  const handleEditNickname = () => {
    setIsEditingNickname(!isEditingNickname);
  };
  
  const handleEditEmailToggle = () => {
    setIsEditingEmail(!isEditingEmail);
  };
  
  const handleEditPasswordToggle = () => {
    setIsEditingPassword(!isEditingPassword);
    // Reset password fields when toggling
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
      // Update the user's metadata with the new nickname
      const { error } = await supabase.auth.updateUser({
        data: { nickname }
      });

      if (error) throw error;

      // Update the nickname in the auth context
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
      // Update the user's email
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
    // Validate passwords
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
    
    // Minimum password length
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
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error("Current password is incorrect");
      }
      
      // Then update to the new password
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      setIsEditingPassword(false);
      
      // Clear password fields
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
    if (!value || value === role) return;
    
    setIsLoading(true);
    try {
      // Update the user's metadata with the new role
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

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-bold text-white mb-4">Profile</h1>
        
        {/* Nickname Box */}
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
        
        {/* Email Box */}
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
        
        {/* Password Box */}
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
        
        {/* Role Box */}
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
                  disabled={isLoading}
                >
                  <ToggleGroupItem 
                    value="dominant" 
                    className="w-full data-[state=on]:bg-purple-600 data-[state=on]:text-white"
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
