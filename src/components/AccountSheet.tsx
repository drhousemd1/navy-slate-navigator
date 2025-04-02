
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2, User, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AccountSheet = () => {
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRole, signOut } = useAuth();
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('Guest');
  const [userRole, setUserRole] = useState<string>('Not logged in');
  
  const toggleProfileOptions = () => {
    setShowProfileOptions(!showProfileOptions);
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };
  
  const handleEncyclopediaClick = () => {
    navigate('/encyclopedia');
  };

  // Load nickname and user role
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        const name = await getNickname();
        const role = await getUserRole();
        if (name) setNickname(name);
        if (role) setUserRole(role);
      }
    };
    
    loadUserData();
  }, [user, getNickname, getUserRole]);

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
    const loadContextImage = async () => {
      if (!profileImage && user) {
        const contextImage = await getProfileImage();
        if (contextImage) {
          console.log('AccountSheet: Using profile image from context:', contextImage);
          setProfileImage(contextImage);
        }
      }
    };
    
    loadContextImage();
  }, [getProfileImage, profileImage, user]);
  
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
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy border border-white"
              onClick={handleEncyclopediaClick}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Encyclopedia
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy border border-red-500 hover:bg-red-800"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Log Out
            </Button>
            
            <p className="text-sm text-gray-400">More options will be added here</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
