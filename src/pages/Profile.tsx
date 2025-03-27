import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Lock, Copy, Check } from 'lucide-react';
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
  const [partnerLinkCode, setPartnerLinkCode] = useState<string>('');
  const [enteredPartnerCode, setEnteredPartnerCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLinkingPartner, setIsLinkingPartner] = useState<boolean>(false);
  const [linkedPartnerNickname, setLinkedPartnerNickname] = useState<string>('');

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
        .select('partner_link_code, linked_partner_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.partner_link_code) {
        setPartnerLinkCode(data.partner_link_code);
      }
      
      if (data?.linked_partner_id) {
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
    if (!value || value === role) return;
    
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

  const generatePartnerCode = async () => {
    setIsLoading(true);
    try {
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('profiles')
        .update({ partner_link_code: randomCode })
        .eq('id', user?.id);
        
      if (error) throw error;
      
      setPartnerLinkCode(randomCode);
      toast({
        title: "Code generated",
        description: "Share this code with your partner to link accounts.",
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
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ linked_partner_id: partnerData.id })
        .eq('id', user?.id);
        
      if (updateError) throw updateError;
      
      const { error: partnerUpdateError } = await supabase
        .from('profiles')
        .update({ linked_partner_id: user?.id })
        .eq('id', partnerData.id);
        
      if (partnerUpdateError) throw partnerUpdateError;
      
      setEnteredPartnerCode('');
      
      await fetchUserProfile();
      
      toast({
        title: "Accounts linked!",
        description: "Your account has been successfully linked with your partner.",
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
      
      toast({
        title: "Accounts unlinked",
        description: "Your account is no longer linked with your partner.",
      });
    } catch (error: any) {
      toast({
        title: "Unlink failed",
        description: error.message || "There was an error unlinking your account.",
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
                  disabled={isLoading}
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
          </div>
        </div>
        
        <div className="bg-navy py-2 px-4 rounded-lg border border-light-navy mb-3">
          <h2 className="text-white font-semibold mb-2">Link Partner</h2>
          
          {linkedPartnerNickname ? (
            <div className="space-y-3">
              <p className="text-white">
                You are linked with: <span className="font-semibold">{linkedPartnerNickname}</span>
              </p>
              <Button 
                variant="destructive" 
                onClick={unlinkPartner}
                disabled={isLoading}
                className="text-white"
              >
                Unlink Partner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-white text-sm mb-2">Generate a code to share with your partner:</p>
                <div className="flex gap-2 items-center">
                  <Button 
                    onClick={generatePartnerCode} 
                    disabled={isLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    Generate Code
                  </Button>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
