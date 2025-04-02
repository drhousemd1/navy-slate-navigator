
import React, { ReactNode, useEffect, useState } from 'react';
import MobileNavbar from './MobileNavbar';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus, MessageSquare } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import AccountSheet from './AccountSheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AppLayoutProps {
  children: React.ReactNode;
  onAddNewItem?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onAddNewItem }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getNickname, getProfileImage, getUserRole } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('Guest');
  const [userRole, setUserRole] = useState<string>('');

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
  
  // Load user data - nickname and role
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

  // Fetch profile directly from Supabase to ensure we get the latest data
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
          console.error('Error fetching profile image:', error);
          return;
        }
        
        if (data && data.avatar_url) {
          console.log('Profile image from DB:', data.avatar_url);
          setProfileImage(data.avatar_url);
        } else {
          console.log('No profile image found in DB for user', user.id);
          setProfileImage(null);
        }
      } catch (err) {
        console.error('Exception fetching profile:', err);
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
          console.log('Using profile image from context:', contextImage);
          setProfileImage(contextImage);
        }
      }
    };
    
    loadContextImage();
  }, [getProfileImage, profileImage, user]);

  // Determine if we're on the rewards page, tasks page, punishments page, or rules page for special styling
  const isRewardsPage = location.pathname === '/rewards';
  const isTasksPage = location.pathname === '/tasks';
  const isPunishmentsPage = location.pathname === '/punishments';
  const isRulesPage = location.pathname === '/rules';
  const useCircleButton = isRewardsPage || isTasksPage || isPunishmentsPage || isRulesPage;

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
              {profileImage ? (
                <AvatarImage 
                  src={profileImage} 
                  alt={nickname}
                  onError={(e) => {
                    console.error('Failed to load avatar image:', profileImage);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
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
            
            {/* Messaging icon */}
            <MessageSquare 
              className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" 
              onClick={() => navigate('/messages')}
            />
          </div>
        </div>
      </div>
      
      <main className={`flex-1 ${isMessagesPage ? '' : 'pb-24'} animate-fade-in`}>
        {children}
      </main>
      
      {shouldShowAddButton && !isMessagesPage && (
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
