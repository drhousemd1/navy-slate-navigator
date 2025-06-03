
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpenCheck,
  CheckSquare,
  Gift,
  Skull
} from 'lucide-react';
import { logger } from '@/lib/logger';

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
];

const MobileNavbar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  logger.debug('MobileNavbar currentPath:', currentPath);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-light-navy backdrop-blur-lg z-50 prevent-mobile-scroll pb-safe-bottom">
      <div className="grid grid-cols-4 h-16 px-4">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center h-full transition-colors duration-200 ${
                isActive ? 'text-[#00FFF7]' : 'text-nav-inactive'
              }`}
            >
              <div className={`flex items-center justify-center h-5 ${isActive ? 'neon-icon' : ''}`}>
                {item.icon}
              </div>
              <div className="h-5 mt-1 overflow-hidden">
                <span className={`text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis px-1 block ${isActive ? 'neon-text' : ''}`}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavbar;
