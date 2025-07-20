
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { useUserIds } from '@/contexts/UserIdsContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, Users, Gift, Settings, LogOut, User, Smartphone } from 'lucide-react';
import AppLogo from './common/AppLogo';
import MobileNavbar from './MobileNavbar';

interface AppLayoutProps {
  children: React.ReactNode;
  onAddNewItem?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onAddNewItem }) => {
  const { user, signOut } = useAuth();
  const { subUserId, domUserId } = useUserIds();
  const location = useLocation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavOpen(false); // Close mobile nav on route change
  }, [location]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message || "Failed to logout. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-navy text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <AppLogo size="small" alt="App Logo" />
            </div>
            <span className="font-bold text-lg">Playful Obedience</span>
          </Link>

          {/* Mobile Navigation Button */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden text-white focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link
              to="/app-store-prep"
              className="bg-accent text-accent-foreground rounded-md px-3 py-1 text-sm hover:bg-accent-hover transition-colors flex items-center gap-2"
            >
              <Smartphone size={16} />
              App Store Prep
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white rounded-md px-3 py-1 text-sm transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Desktop Sidebar Navigation */}
        <aside
          className={cn(
            "bg-navy w-64 flex-shrink-0 p-4 space-y-2 hidden md:flex flex-col",
            isMobileNavOpen && "hidden"
          )}
        >
          <Link
            to="/"
            className={cn(
              "flex items-center justify-center w-full h-14 rounded-lg transition-colors",
              location.pathname === "/"
                ? "bg-nav-active text-white"
                : "text-nav-inactive hover:text-white hover:bg-nav-hover"
            )}
          >
            <Home size={24} />
            <span className="sr-only">Home</span>
          </Link>

          {onAddNewItem && (
            <button
              onClick={onAddNewItem}
              className="flex items-center justify-center w-full h-14 rounded-lg text-nav-inactive hover:text-white hover:bg-nav-hover transition-colors"
            >
              <Plus size={24} />
              <span className="sr-only">Add New Item</span>
            </button>
          )}

          <Link
            to="/rewards"
            className={cn(
              "flex items-center justify-center w-full h-14 rounded-lg transition-colors",
              location.pathname === '/rewards'
                ? "bg-nav-active text-white"
                : "text-nav-inactive hover:text-white hover:bg-nav-hover"
            )}
          >
            <Gift size={24} />
            <span className="sr-only">Rewards</span>
          </Link>

          <Link
            to="/app-store-prep"
            className={cn(
              "flex items-center justify-center w-full h-14 rounded-lg transition-colors",
              location.pathname === '/app-store-prep'
                ? "bg-nav-active text-white"
                : "text-nav-inactive hover:text-white hover:bg-nav-hover"
            )}
          >
            <Smartphone size={24} />
            <span className="sr-only">App Store Prep</span>
          </Link>
        </aside>

        {/* Mobile Navigation Overlay */}
        <div
          className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex-col items-center justify-center hidden",
            isMobileNavOpen ? "flex" : "hidden"
          )}
        >
          <nav className="flex flex-col items-center space-y-4">
            <Link to="/" className="text-lg text-white" onClick={() => setIsMobileNavOpen(false)}>
              Home
            </Link>
            {onAddNewItem && (
              <button onClick={() => { onAddNewItem(); setIsMobileNavOpen(false); }} className="text-lg text-white">
                Add New Item
              </button>
            )}
            <Link to="/rewards" className="text-lg text-white" onClick={() => setIsMobileNavOpen(false)}>
              Rewards
            </Link>
            <Link to="/app-store-prep" className="text-lg text-white" onClick={() => setIsMobileNavOpen(false)}>
              App Store Prep
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white rounded-md px-3 py-1 text-sm transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 container mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavbar />
    </div>
  );
};

export default AppLayout;
