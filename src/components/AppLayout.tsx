
import React, { ReactNode } from 'react';
import MobileNavbar from './MobileNavbar';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

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

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy">
      <main className="flex-1 pb-24 animate-fade-in">
        {children}
      </main>
      
      {shouldShowAddButton && (
        <div className="fixed bottom-16 right-4 z-40">
          <Button 
            className="bg-cyan-500 hover:bg-cyan-400 w-12 h-12 rounded-full shadow-xl p-0 flex items-center justify-center"
            onClick={handleAddNewItem}
          >
            <Plus className="w-6 h-6 text-white" />
          </Button>
        </div>
      )}
      
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
