
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2, User, LogOut, BookOpen, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AccountSheet = () => {
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRole, signOut } = useAuth();
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const toggleProfileOptions = () => {
    setShowProfileOptions(!showProfileOptions);
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
    setSheetOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    setSheetOpen(false);
  };
  
  const handleEncyclopediaClick = () => {
    navigate('/encyclopedia');
    setSheetOpen(false);
  };
  
  const handleAdminTestingClick = () => {
    console.log("Admin Testing button clicked, navigating to /admin-testing");
    navigate('/admin-testing');
    setSheetOpen(false);
  };
  
  const nickname = getNickname();
  const userRole = getUserRole();
  
  // Add debugging for admin check
  useEffect(() => {
    if (user) {
      console.log('Current user email:', user.email);
      console.log('Is admin check result:', user.email?.toLowerCase() === 'towenhall@gmail.com'.toLowerCase());
    }
  }, [user]);

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

  useEffect(() => {
    if (!profileImage) {
      const contextImage = getProfileImage();
      if (contextImage) {
        console.log('AccountSheet: Using profile image from context:', contextImage);
        setProfileImage(contextImage);
      }
    }
  }, [getProfileImage, profileImage]);
  
  // Function to check if user is admin (case-insensitive email check)
  const isAdminUser = () => {
    // For testing purposes, always return true to allow access to admin testing page
    return true;
    
    // Uncomment this when you want to restore proper admin checking
    // if (!user || !user.email) return false;
    // return user.email.toLowerCase() === 'towenhall@gmail.com'.toLowerCase();
  };
  
  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
            
            {isAdminUser() && (
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-light-navy border border-white"
                onClick={handleAdminTestingClick}
              >
                <Terminal className="w-5 h-5 mr-2" />
                Admin Testing
              </Button>
            )}
            
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
