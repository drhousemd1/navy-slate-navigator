
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

  // Only show "Add" button for specific routes, excluding the rewards page
  const shouldShowAddButton = 
    (location.pathname === '/tasks' || 
    location.pathname === '/rules' || 
    location.pathname === '/punishments') &&
    location.pathname !== '/rewards';

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
        <div className="fixed bottom-16 left-0 right-0 flex justify-center py-2 z-10">
          <Button 
            className="bg-navy border border-light-navy text-nav-active rounded-full shadow-lg px-6"
            onClick={handleAddNewItem}
          >
            <Plus className="w-5 h-5 mr-2" /> Add New Item
          </Button>
        </div>
      )}
      
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
