
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Home, 
  Calendar, 
  Book, 
  Shield, 
  Award, 
  User, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const navItems = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
    { path: '/tasks', icon: <Calendar className="w-5 h-5" />, label: 'Tasks' },
    { path: '/rules', icon: <Book className="w-5 h-5" />, label: 'Rules' },
    { path: '/rewards', icon: <Award className="w-5 h-5" />, label: 'Rewards' },
    { path: '/punishments', icon: <Shield className="w-5 h-5" />, label: 'Punishments' },
    { path: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-64 bg-slate-800 p-4 flex flex-col">
          <div className="text-xl font-bold mb-8 p-2">Task Manager</div>
          <nav className="space-y-2 flex-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <button 
            onClick={handleSignOut}
            className="flex items-center space-x-2 p-3 text-gray-300 hover:bg-slate-700 rounded-lg w-full mt-auto"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-slate-800 p-4 flex justify-between items-center z-10">
          <div className="text-xl font-bold">Task Manager</div>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg text-gray-300 hover:bg-slate-700"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Mobile Menu */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 bg-slate-800 p-4 z-10">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2 p-3 text-gray-300 hover:bg-slate-700 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 ${isMobile ? 'pt-16' : ''}`}>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
