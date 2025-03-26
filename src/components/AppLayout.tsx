
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

interface AppLayoutProps {
  children: React.ReactNode;
  onAddNewItem?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onAddNewItem }) => {
  const location = useLocation();
  const navigate = useNavigate();

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

  // Determine if we're on the rewards page, tasks page, or punishments page for special styling
  const isRewardsPage = location.pathname === '/rewards';
  const isTasksPage = location.pathname === '/tasks';
  const isPunishmentsPage = location.pathname === '/punishments';
  const useCircleButton = isRewardsPage || isTasksPage || isPunishmentsPage;

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy">
      {/* Top header section with settings icon */}
      <div className="w-full bg-navy border-b border-light-navy py-2 px-4">
        <div className="max-w-screen-lg mx-auto flex justify-between items-center">
          <div>{/* Left side - empty for now */}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Settings className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-navy border border-light-navy text-white z-50">
              <DropdownMenuItem className="hover:bg-light-navy cursor-pointer" onClick={() => navigate('/encyclopedia')}>
                Encyclopedia
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
