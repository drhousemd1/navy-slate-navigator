
import React, { ReactNode } from 'react';
import MobileNavbar from './MobileNavbar';
import { useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const getButtonText = (pathname: string): string | null => {
  switch (pathname) {
    case '/rules':
      return 'Add New Rule';
    case '/tasks':
      return 'Add New Task';
    case '/rewards':
      return 'Add New Reward';
    case '/punishments':
      return 'Add New Punishment';
    default:
      return null;
  }
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const buttonText = getButtonText(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy">
      <main className="flex-1 animate-fade-in">
        {children}
      </main>
      
      {buttonText && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center py-2 z-10">
          <Button 
            className="bg-navy border border-light-navy text-nav-active rounded-full shadow-lg px-6"
          >
            <Plus className="w-5 h-5 mr-2" /> {buttonText}
          </Button>
        </div>
      )}
      
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
