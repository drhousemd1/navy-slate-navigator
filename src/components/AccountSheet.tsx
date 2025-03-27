
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AccountSheet = () => {
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRole } = useAuth();
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const toggleProfileOptions = () => {
    setShowProfileOptions(!showProfileOptions);
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  // Get user's nickname and role
  const nickname = getNickname();
  const userRole = getUserRole(); // This will now return properly capitalized role
  
  // Fetch the profile image directly from the database
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user) {
        setProfileImage(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('AccountSheet: Error fetching profile image:', error);
          return;
        }
        
        if (data && data.avatar_url) {
          console.log('AccountSheet: Profile image from DB:', data.avatar_url);
          setProfileImage(data.avatar_url);
        } else {
          console.log('AccountSheet: No profile image found in DB for user', user.id);
          setProfileImage(null);
        }
      } catch (err) {
        console.error('AccountSheet: Exception fetching profile:', err);
      }
    };

    fetchProfileImage();
  }, [user]);

  // Use context function as fallback
  useEffect(() => {
    if (!profileImage) {
      const contextImage = getProfileImage();
      if (contextImage) {
        console.log('AccountSheet: Using profile image from context:', contextImage);
        setProfileImage(contextImage);
      }
    }
  }, [getProfileImage, profileImage]);
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <UserCircle2 className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[75vw] bg-navy border-r border-light-navy text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Account</SheetTitle>
        </SheetHeader>
        
        <div className="py-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-12 w-12 border border-light-navy">
              {profileImage ? (
                <AvatarImage 
                  src={profileImage} 
                  alt={nickname} 
                  onError={(e) => {
                    console.error('AccountSheet: Failed to load avatar image:', profileImage);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-light-navy text-nav-active">
                {nickname ? nickname.charAt(0).toUpperCase() : 'G'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">
                {user ? nickname : 'Guest'}
              </p>
              <p className="text-sm text-gray-400">
                {user ? userRole : 'Not logged in'}
              </p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy border border-white"
              onClick={toggleProfileOptions}
            >
              <User className="w-5 h-5 mr-2" />
              Account
            </Button>
            
            {/* Profile dropdown menu */}
            {showProfileOptions && (
              <div className="ml-6 space-y-2 animate-fade-in">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-white hover:bg-light-navy"
                  onClick={handleProfileClick}
                >
                  Profile
                </Button>
              </div>
            )}
            
            {/* Placeholder for future menu items */}
            <p className="text-sm text-gray-400">More options will be added here</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
