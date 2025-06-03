
import React, { ReactNode, useEffect, useState } from 'react';
import MobileNavbar from './MobileNavbar';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus, MessageSquare, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/auth';
import AccountSheet from './AccountSheet';
import { logger } from '@/lib/logger';

interface AppLayoutProps {
  children: React.ReactNode;
  onAddNewItem?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onAddNewItem }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getNickname, getProfileImage, getUserRole } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Only show "Add" button for specific routes
  const shouldShowAddButton = 
    location.pathname === '/tasks' || 
    location.pathname === '/rules' || 
    location.pathname === '/rewards' || 
    location.pathname === '/punishments';
    
  // Don't add bottom padding on messages page
  const isMessagesPage = location.pathname === '/messages';

  const handleAddNewItem = () => {
    if (onAddNewItem) {
      onAddNewItem();
    }
  };
  
  // Get profile image and nickname for the avatar directly from context
  const nickname = getNickname();
  const userRole = getUserRole();

  // Get profile image from context - no direct Supabase calls
  useEffect(() => {
    const contextImage = getProfileImage();
    if (contextImage) {
      logger.debug('Using profile image from context:', contextImage);
      setProfileImage(contextImage);
    }
  }, [getProfileImage]);

  // Determine if we're on the rewards page, tasks page, punishments page, or rules page for special styling
  const isRewardsPage = location.pathname === '/rewards';
  const isTasksPage = location.pathname === '/tasks';
  const isPunishmentsPage = location.pathname === '/punishments';
  const isRulesPage = location.pathname === '/rules';
  const isThroneRoomPage = location.pathname === '/throne-room';
  const useCircleButton = isRewardsPage || isTasksPage || isPunishmentsPage || isRulesPage;

  return (
    <div className="flex flex-col h-full bg-dark-navy prevent-overscroll overflow-x-hidden">
      {/* Top header section with account and settings icons - NOW WITH SAFE AREA */}
      <div className="fixed top-0 left-0 right-0 w-full bg-navy border-b border-light-navy pt-safe-top py-2 px-4 z-50 prevent-mobile-scroll overflow-x-hidden">
        <div className="max-w-screen-lg mx-auto flex justify-between items-center w-full">
          <div className="flex items-center">
            {/* Left side avatar */}
            <Avatar 
              className="h-7 w-7 cursor-pointer" 
              onClick={() => navigate('/profile')}
            >
              {profileImage ? (
                <AvatarImage 
                  src={profileImage} 
                  alt={nickname ?? "User Avatar"}
                  onError={(e) => {
                    logger.error('Failed to load avatar image:', profileImage);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-light-navy text-nav-active text-xs">
                {nickname ? nickname.charAt(0).toUpperCase() : 'G'}
              </AvatarFallback>
            </Avatar>
            
            {/* Username and role display */}
            <div className="ml-2">
              <p className="text-white text-sm font-medium leading-tight break-words">{nickname}</p>
              <p className="text-gray-400 text-xs leading-tight break-words">{userRole}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Character icon for account/login using our new AccountSheet component */}
            <AccountSheet />
            
            {/* Throne Room icon */}
            <Crown 
              className={`w-5 h-5 cursor-pointer transition-colors ${
                isThroneRoomPage ? 'text-[#00FFF7] neon-icon' : 'text-gray-300 hover:text-cyan-500'
              }`}
              onClick={() => navigate('/throne-room')}
            />

            {/* Messaging icon */}
            <MessageSquare 
              className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" 
              onClick={() => navigate('/messages')}
            />
          </div>
        </div>
      </div>
      
      {/* Main content with adjusted padding to account for safe area header */}
      <main className={`flex-1 pt-[calc(4rem+env(safe-area-inset-top))] ${isMessagesPage ? 'pb-0' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'} overflow-y-auto overflow-x-hidden animate-fade-in allow-scroll-y w-full max-w-full`}>
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
      
      {shouldShowAddButton && !isMessagesPage && (
        <div className={`fixed left-0 right-0 flex justify-center py-2 z-40`} style={{bottom: `calc(4.1rem + env(safe-area-inset-bottom))`}}>
          <Button 
            className={`${useCircleButton 
              ? 'bg-green-500 hover:bg-green-600 w-10 h-10 rounded-full shadow-xl p-0 flex items-center justify-center' 
              : 'bg-navy border border-light-navy text-nav-active rounded-full shadow-lg px-6'}`}
            onClick={handleAddNewItem}
          >
            {useCircleButton ? (
              <Plus className="w-6 h-6 text-white" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" /> Add New Item
              </>
            )}
          </Button>
        </div>
      )}
      
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
