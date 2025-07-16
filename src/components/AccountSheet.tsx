import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2, User, LogOut, BookOpen, ShieldCheck, Activity, Palette, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';

const AccountSheet = () => {
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRoleSync, signOut, isAdmin } = useAuth();
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
    logger.debug('AccountSheet: User signed out. Cache purging handled by AuthContext.');
    navigate('/auth');
    setSheetOpen(false);
  };
  
  const handleEncyclopediaClick = () => {
    navigate('/encyclopedia');
    setSheetOpen(false);
  };

  const handleWellbeingClick = () => {
    navigate('/wellbeing');
    setSheetOpen(false);
  };

  const handleAdminPanelClick = () => {
    navigate('/admin-panel');
    setSheetOpen(false);
  };

  const handleColorSchemeClick = () => {
    navigate('/profile/color-scheme');
    setSheetOpen(false);
  };

  const handleNotificationsClick = () => {
    navigate('/profile/notifications');
    setSheetOpen(false);
  };
  
  const nickname = getNickname();
  const userRole = getUserRoleSync(); // Use synchronous version for UI
  
  useEffect(() => {
    if (user) {
      logger.debug('AccountSheet: Current user email:', user.email);
      logger.debug('AccountSheet: isAdmin from AuthContext:', isAdmin);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    const contextImage = getProfileImage();
    if (contextImage) {
      logger.debug('AccountSheet: Using profile image from context:', contextImage);
      setProfileImage(contextImage);
    } else {
      setProfileImage(null); 
    }
  }, [getProfileImage, user]);
  
  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <UserCircle2 className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[75vw] sm:w-[300px] bg-navy border-r border-light-navy text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Account</SheetTitle>
        </SheetHeader>
        
        <div className="py-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-12 w-12 border border-light-navy">
              {user && profileImage ? (
                <AvatarImage 
                  src={profileImage} 
                  alt={nickname || 'User Avatar'} 
                  onError={(e) => {
                    logger.error('AccountSheet: Failed to load avatar image:', profileImage);
                    (e.target as HTMLImageElement).style.display = 'none'; 
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-light-navy text-nav-active flex items-center justify-center">
                {user && nickname ? (
                  nickname.charAt(0).toUpperCase()
                ) : (
                  <UserCircle2 className="w-3/4 h-3/4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              {user ? (
                <>
                  <p className="text-lg font-medium">
                    {nickname}
                  </p>
                  <p className="text-sm text-gray-400">
                    {userRole} {isAdmin && <span className="text-cyan-400">(Admin)</span>}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Not Logged In</p>
                  <p className="text-sm text-gray-400">Please log in or sign up</p>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2 mt-6"> {/* Reduced space-y for tighter packing */}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-white/50"
              onClick={toggleProfileOptions}
              disabled={!user} // Disable if no user
            >
              <User className="w-5 h-5 mr-3" /> {/* Increased mr for icon spacing */}
              Account
            </Button>
            
            {showProfileOptions && user && ( // Only show if user exists
              <div className="ml-8 space-y-1 animate-fade-in"> {/* Increased ml, reduced space-y */}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-300 hover:text-cyan-300 hover:bg-light-navy/70 py-1.5" // Adjusted padding
                  onClick={handleProfileClick}
                >
                  Profile
                </Button>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-white/50"
              onClick={handleEncyclopediaClick}
            >
              <BookOpen className="w-5 h-5 mr-3" />
              Encyclopedia
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-white/50"
              onClick={handleWellbeingClick}
            >
              <Activity className="w-5 h-5 mr-3" />
              Wellbeing
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-white/50"
              onClick={handleColorSchemeClick}
            >
              <Palette className="w-5 h-5 mr-3" />
              Color Scheme
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-white/50"
              onClick={handleNotificationsClick}
            >
              <Bell className="w-5 h-5 mr-3" />
              Notifications
            </Button>

            {isAdmin && user && ( // Show Admin Panel button if user is admin
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-cyan-500/50"
                onClick={handleAdminPanelClick}
              >
                <ShieldCheck className="w-5 h-5 mr-3 text-cyan-400" />
                Admin Panel
              </Button>
            )}
            
            {user && ( // Only show logout if user is logged in
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-800/50 border border-red-500/50 mt-4" // Added margin top
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Log Out
              </Button>
            )}
            
            {!user && ( // Show login if no user
               <Button 
                variant="ghost" 
                className="w-full justify-start text-cyan-400 hover:text-cyan-300 hover:bg-cyan-800/50 border border-cyan-500/50 mt-4"
                onClick={() => { navigate('/auth'); setSheetOpen(false); }}
              >
                <LogOut className="w-5 h-5 mr-3" /> {/* Or UserPlus icon */}
                Log In / Sign Up
              </Button>
            )}

            {/* <p className="text-xs text-gray-500 pt-4 text-center">More options will be added here</p> */}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
