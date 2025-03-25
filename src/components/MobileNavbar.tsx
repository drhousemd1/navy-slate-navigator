
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
    icon: <BookOpenCheck className="w-6 h-6" />,
  },
  {
    name: 'Tasks',
    path: '/tasks',
    icon: <CheckSquare className="w-6 h-6" />,
  },
  {
    name: 'Rewards',
    path: '/rewards',
    icon: <Gift className="w-6 h-6" />,
  },
  {
    name: 'Punishments',
    path: '/punishments',
    icon: <Medal className="w-6 h-6" />,
  },
  {
    name: 'Throne Room',
    path: '/throne-room',
    icon: <Crown className="w-6 h-6" />,
  },
];

const MobileNavbar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-light-navy backdrop-blur-lg">
      <div className="flex justify-between items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item flex flex-col items-center justify-center ${
                isActive ? 'active flex-1' : 'w-10'
              } transition-all duration-200`}
            >
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
              
              {isActive && (
                <span className="text-xs mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.name}
                </span>
              )}
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
