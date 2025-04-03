
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpenCheck, 
  CheckSquare, 
  Gift, 
  Skull, 
  Crown
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: 'Rules',
    path: '/rules',
    icon: <BookOpenCheck className="w-5 h-5" />,
  },
  {
    name: 'Tasks',
    path: '/tasks',
    icon: <CheckSquare className="w-5 h-5" />,
  },
  {
    name: 'Rewards',
    path: '/rewards',
    icon: <Gift className="w-5 h-5" />,
  },
  {
    name: 'Punishments',
    path: '/punishments',
    icon: <Skull className="w-5 h-5" />,
  },
  {
    name: 'Throne Room',
    path: '/throne-room',
    icon: <Crown className="w-5 h-5" />,
  },
];

const MobileNavbar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-light-navy backdrop-blur-lg z-50">
      <div className="grid grid-cols-5 h-16 px-4">
        {navItems.map((item) => {
          // Fix for route matching - compare just the currentPath with item.path
          const isActive = currentPath === item.path;
          
          console.log(`Clicked ${item.name}: Path: ${item.path}, Current: ${currentPath}, Active: ${isActive}`);
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center h-full transition-colors duration-200 ${
                isActive ? 'text-[#00FFF7]' : 'text-nav-inactive'
              }`}
              onClick={() => {
                // Enhanced logging for debugging navigation clicks
                console.log(`Navigation clicked: ${item.name} to ${item.path}`);
              }}
            >
              {/* Icon always positioned at the same height */}
              <div className={`flex items-center justify-center h-5 ${isActive ? 'neon-icon' : ''}`}>
                {item.icon}
              </div>
              
              {/* Always show the text label, highlighted when active */}
              <div className="h-5 mt-1 overflow-hidden">
                <span className={`text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis px-1 block ${isActive ? 'neon-text' : ''}`}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Add a safe area inset for iOS devices */}
      <div className="h-safe-area-inset-bottom bg-navy" />
    </nav>
  );
};

export default MobileNavbar;
