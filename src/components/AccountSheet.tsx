
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2, User, LogOut, BookOpen, ShieldCheck } from 'lucide-react'; // Added ShieldCheck for admin
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
// import { useQueryClient } from '@tanstack/react-query'; // No longer needed for purge
// import { purgeQueryCache } from '@/lib/react-query-config'; // No longer needed here

const AccountSheet = () => {
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRole, signOut, isAdmin } = useAuth(); // Added isAdmin
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // const queryClient = useQueryClient(); // No longer needed

  const toggleProfileOptions = () => {
    setShowProfileOptions(!showProfileOptions);
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
    setSheetOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    // await purgeQueryCache(queryClient); // Removed: Cache clearing is handled by AuthContext on SIGNED_OUT
    console.log('AccountSheet: User signed out. Cache purging handled by AuthContext.');
    navigate('/auth'); // Navigate to auth page after sign out
    setSheetOpen(false);
  };
  
  const handleEncyclopediaClick = () => {
    navigate('/encyclopedia');
    setSheetOpen(false);
  };

  const handleAdminPanelClick = () => {
    navigate('/admin-panel'); // Example route, adjust as needed
    setSheetOpen(false);
  };
  
  const nickname = getNickname();
  const userRole = getUserRole();
  
  useEffect(() => {
    if (user) {
      console.log('AccountSheet: Current user email:', user.email);
      // console.log('AccountSheet: Is admin check result via email (example):', user.email?.toLowerCase() === 'towenhall@gmail.com'.toLowerCase());
      console.log('AccountSheet: isAdmin from AuthContext:', isAdmin);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    const contextImage = getProfileImage();
    if (contextImage) {
      console.log('AccountSheet: Using profile image from context:', contextImage);
      setProfileImage(contextImage);
    } else {
      // Clear local state if context image is removed/null
      setProfileImage(null); 
    }
  }, [getProfileImage, user]); // Added user dependency, as getProfileImage might change behavior based on user
  
  // const isAdminUser = () => { // This function is unused and was incorrect
  //   return true;
  // };
  
  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <UserCircle2 className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[75vw] sm:w-[300px] bg-navy border-r border-light-navy text-white" // Added sm breakpoint for width
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
                  alt={nickname || 'User'} 
                  onError={(e) => {
                    console.error('AccountSheet: Failed to load avatar image:', profileImage);
                    (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image
                    // Optionally set a flag to show fallback or just let fallback render
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
                {user ? userRole : 'Not logged in'} {isAdmin && user ? <span className="text-cyan-400">(Admin)</span> : ""}
              </p>
            </div>
          </div>
          
          <div className="space-y-2 mt-6"> {/* Reduced space-y for tighter packing */}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white hover:bg-light-navy hover:text-cyan-300 border border-white/50"
              onClick={toggleProfileOptions}
            >
              <User className="w-5 h-5 mr-3" /> {/* Increased mr for icon spacing */}
              Account
            </Button>
            
            {showProfileOptions && (
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
