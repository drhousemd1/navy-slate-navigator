
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
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-item flex flex-col items-center justify-center w-full py-1 ${
              currentPath === item.path ? 'active' : ''
            }`}
          >
            <div className="flex items-center justify-center mb-1">
              {item.icon}
            </div>
            <span className="text-xs">{item.name}</span>
          </Link>
        ))}
      </div>
      
      {/* Add a safe area inset for iOS devices */}
      <div className="h-safe-area-inset-bottom bg-navy" />
    </nav>
  );
};

export default MobileNavbar;
