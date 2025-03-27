
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, updateNickname } = useAuth();
  const [nickname, setNickname] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      // Default to email username (part before @)
      const defaultNickname = user.email ? user.email.split('@')[0] : 'User';
      
      // Try to get the nickname from user metadata if it exists
      const userNickname = user.user_metadata?.nickname || defaultNickname;
      setNickname(userNickname);
    }
  }, [user]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
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
      setIsEditing(false);
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

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-bold text-white mb-4">Profile</h1>
        <div className="bg-navy py-3 px-4 rounded-lg border border-light-navy">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Nickname:</label>
              {!isEditing && (
                <p className="text-white">{nickname}</p>
              )}
            </div>
            {!isEditing && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white"
                onClick={handleEditToggle}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isEditing && (
            <div className="flex gap-2 mt-2">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-light-navy text-white border-light-navy"
                placeholder="Enter nickname"
              />
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Save
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEditToggle}
                className="border-light-navy text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
