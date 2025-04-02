
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpenCheck, 
  CheckSquare, 
  Gift, 
  Skull, 
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/auth/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
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
    adminOnly: true,
  },
];

const MobileNavbar: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [visibleItems, setVisibleItems] = useState<NavItem[]>([]);
  const currentPath = location.pathname;
  
  // Effect to filter items when isAdmin changes
  useEffect(() => {
    const filtered = navItems.filter(item => {
      // Show the item if it's not admin-only or if the user is an admin
      return !item.adminOnly || (item.adminOnly && isAdmin);
    });
    setVisibleItems(filtered);
    console.log("Admin status:", isAdmin, "Filtered items:", filtered.length);
  }, [isAdmin]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-light-navy backdrop-blur-lg z-50">
      <div className="grid grid-cols-5 h-16 px-4">
        {visibleItems.map((item) => {
          const isActive = currentPath === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center h-full transition-colors duration-200 ${
                isActive ? 'text-[#00FFF7]' : 'text-nav-inactive'
              }`}
            >
              {/* Icon always positioned at the same height */}
              <div className={`flex items-center justify-center h-5 ${isActive ? 'neon-icon' : ''}`}>
                {item.icon}
              </div>
              
              {/* Label with conditional visibility */}
              <div className="h-5 mt-1 overflow-hidden">
                <span className={`text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis px-1 block ${isActive ? 'neon-text' : 'opacity-0'}`}>
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
