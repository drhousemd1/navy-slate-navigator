
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpenCheck, 
  CheckSquare, 
  Gift, 
  Medal, 
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
    icon: <Medal className="w-5 h-5" />,
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
    <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-light-navy backdrop-blur-lg">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-center ${
                isActive ? 'text-nav-active' : 'text-nav-inactive'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                
                {isActive && (
                  <span className="text-xs mt-1 whitespace-nowrap">
                    {item.name}
                  </span>
                )}
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
