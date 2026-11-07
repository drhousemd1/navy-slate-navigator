import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2, User, LogOut, BookOpen, ShieldCheck, Activity, Palette, Bell, Home, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { useBrandingAccess } from '@/data/branding/queries';
import { useAdminDocumentAccess } from '@/features/admin-documents/useAdminDocumentAccess';

const AccountSheet = () => {
  const { currentScheme } = useColorScheme();
  const isLightScheme = currentScheme === 'light-turquoise';
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRoleSync, signOut, isAdmin } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const documentAccess = useAdminDocumentAccess(sheetOpen);
  const brandingAccess = useBrandingAccess(sheetOpen);
  
  const handleProfileClick = () => {
    navigate('/profile');
    setSheetOpen(false);
  };

  const handleLogout = async () => {
    setSheetOpen(false);
    await signOut(); // The authenticated route redirects only after this session actually ends.
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

  const handleHomeClick = () => {
    navigate('/');
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
        <button type="button" aria-label="Open account menu" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
          <UserCircle2 aria-hidden="true" className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        </button>
      </SheetTrigger>
      <SheetContent 
        side="left"
        aria-describedby={undefined}
        className="w-[75vw] sm:w-[300px] overflow-y-auto overscroll-y-contain bg-navy border-r border-light-navy text-foreground"
      >
        <SheetHeader>
          <SheetTitle className="text-foreground">Account</SheetTitle>
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
              <AvatarFallback className={`bg-light-navy flex items-center justify-center ${isLightScheme ? 'text-foreground' : 'text-nav-active'}`}>
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
                  <p className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {userRole} {isAdmin && <span className={isLightScheme ? 'text-foreground' : 'text-cyan-400'}>(Admin)</span>}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Not Logged In</p>
                  <p className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-muted-foreground'}`}>Please log in or sign up</p>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2 mt-6"> {/* Reduced space-y for tighter packing */}
            <Button 
              variant="ghost" 
              className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
              onClick={handleHomeClick}
            >
              <Home className="w-5 h-5 mr-3" />
              Home
            </Button>
            <Button 
              variant="ghost" 
              className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
              onClick={handleProfileClick}
              disabled={!user} // Disable if no user
            >
              <User className="w-5 h-5 mr-3" />
              Account
            </Button>
            
            <Button 
              variant="ghost" 
              className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
              onClick={handleEncyclopediaClick}
            >
              <BookOpen className="w-5 h-5 mr-3" />
              Encyclopedia
            </Button>

            <Button 
              variant="ghost" 
              className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
              onClick={handleWellbeingClick}
            >
              <Activity className="w-5 h-5 mr-3" />
              Wellbeing
            </Button>

            <Button 
              variant="ghost" 
              className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
              onClick={handleColorSchemeClick}
            >
              <Palette className="w-5 h-5 mr-3" />
              Color Scheme
            </Button>

            <Button 
              variant="ghost" 
              className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
              onClick={handleNotificationsClick}
            >
              <Bell className="w-5 h-5 mr-3" />
              Notifications
            </Button>

            {brandingAccess === 'allowed' && user && (
              <Button variant="ghost"
                className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-white/50'}`}
                onClick={() => { navigate('/logo-upload'); setSheetOpen(false); }}>
                <ImageIcon className="w-5 h-5 mr-3" aria-hidden="true" />
                App Logo
              </Button>
            )}

            {documentAccess === 'allowed' && user && (
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-foreground hover:bg-light-navy border ${isLightScheme ? 'hover:text-foreground border-border' : 'hover:text-cyan-300 border-cyan-500/50'}`}
                onClick={handleAdminPanelClick}
              >
                <ShieldCheck className={`w-5 h-5 mr-3 ${isLightScheme ? 'text-foreground' : 'text-cyan-400'}`} />
                Admin Panel
              </Button>
            )}
            
            {user && ( // Only show logout if user is logged in
              <Button 
                variant="ghost" 
                className={`w-full justify-start border mt-4 ${isLightScheme ? 'text-red-700 hover:text-red-800 hover:bg-red-100 border-red-700/50' : 'text-red-400 hover:text-red-300 hover:bg-red-800/50 border-red-500/50'}`} // Added margin top
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Log Out
              </Button>
            )}
            
            {!user && ( // Show login if no user
               <Button 
                variant="ghost" 
                className={`w-full justify-start border mt-4 ${isLightScheme ? 'text-foreground hover:text-foreground hover:bg-light-navy border-border' : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-800/50 border-cyan-500/50'}`}
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
