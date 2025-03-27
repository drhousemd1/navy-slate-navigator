
import React, { ReactNode } from 'react';
import MobileNavbar from './MobileNavbar';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus, Settings } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import AccountSheet from './AccountSheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  onAddNewItem?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onAddNewItem }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRole } = useAuth();

  // Only show "Add" button for specific routes
  const shouldShowAddButton = 
    location.pathname === '/tasks' || 
    location.pathname === '/rules' || 
    location.pathname === '/rewards' || 
    location.pathname === '/punishments';

  const handleAddNewItem = () => {
    if (onAddNewItem) {
      onAddNewItem();
    }
  };
  
  // Get profile image and nickname for the avatar
  const nickname = getNickname();
  const profileImageUrl = getProfileImage();
  
  // For this implementation, we're hardcoding the role types
  // In a real implementation, you would fetch this from your database
  const userRole = getUserRole(); // Use the getUserRole function from AuthContext

  // Determine if we're on the rewards page, tasks page, or punishments page for special styling
  const isRewardsPage = location.pathname === '/rewards';
  const isTasksPage = location.pathname === '/tasks';
  const isPunishmentsPage = location.pathname === '/punishments';
  const useCircleButton = isRewardsPage || isTasksPage || isPunishmentsPage;

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy">
      {/* Top header section with account and settings icons */}
      <div className="w-full bg-navy border-b border-light-navy py-2 px-4">
        <div className="max-w-screen-lg mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {/* Left side avatar */}
            <Avatar 
              className="h-7 w-7 cursor-pointer" 
              onClick={() => navigate('/profile')}
            >
              <AvatarImage src={profileImageUrl} alt={nickname} />
              <AvatarFallback className="bg-light-navy text-nav-active text-xs">
                {nickname ? nickname.charAt(0).toUpperCase() : 'G'}
              </AvatarFallback>
            </Avatar>
            
            {/* Username and role display */}
            <div className="ml-2">
              <p className="text-white text-sm font-medium leading-tight">{nickname}</p>
              <p className="text-gray-400 text-xs leading-tight">{userRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Character icon for account/login using our new AccountSheet component */}
            <AccountSheet />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Settings className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-navy border border-light-navy text-white z-50">
                <DropdownMenuItem className="hover:bg-light-navy cursor-pointer" onClick={() => navigate('/encyclopedia')}>
                  Encyclopedia
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-light-navy cursor-pointer" onClick={() => navigate('/profile')}>
                  Edit Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <main className="flex-1 pb-24 animate-fade-in">
        {children}
      </main>
      
      {shouldShowAddButton && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center py-2 z-40">
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
