
import React, { ReactNode } from 'react';
import MobileNavbar from './MobileNavbar';
import { useLocation, useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
  onAddNewItem?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onAddNewItem }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy">
      <main className="flex-1 pb-24 animate-fade-in">
        {children}
      </main>
      
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
