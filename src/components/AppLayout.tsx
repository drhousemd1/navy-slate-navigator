
import React from 'react';
import MobileNavbar from './MobileNavbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-dark-navy">
      <main className="flex-1 pb-20 animate-fade-in">
        {children}
      </main>
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
