
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, ListChecks, Trophy, BookOpen, MessageSquare, UserCircle, Settings, ShieldAlert, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth'; // Correct path
import { APP_CONFIG } from '@/config/constants';
import { logger } from '@/lib/logger'; // Added logger

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, exact = false, disabled = false }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className={cn(
        "flex flex-col items-center justify-center space-y-1 p-2 rounded-md transition-colors",
        "text-nav-inactive hover:text-nav-active",
        isActive && "text-nav-active bg-nav-active-bg",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      aria-disabled={disabled}
      onClick={(e) => disabled && e.preventDefault()}
    >
      <Icon className={cn("w-5 h-5", isActive ? "text-nav-active" : "text-nav-inactive group-hover:text-nav-active")} />
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
};

const MobileNavbar: React.FC = () => {
  const { user, currentRole, partnerId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // For potential future use with a "more" menu

  const commonNavItems = [
    { to: "/", icon: Home, label: "Home", exact: true },
    { to: "/tasks", icon: ListChecks, label: "Tasks" },
    { to: "/rewards", icon: Trophy, label: "Rewards" },
    { to: "/rules", icon: ShieldAlert, label: "Rules" },
    { to: "/encyclopedia", icon: BookOpen, label: "Lore" },
  ];
  
  const domNavItems = [
    ...commonNavItems,
    { to: "/throne-room", icon: Waypoints, label: "Throne" },
    { to: "/messages", icon: MessageSquare, label: "Messages", disabled: !partnerId && !authLoading },
  ];

  const subNavItems = [
    ...commonNavItems,
    { to: "/messages", icon: MessageSquare, label: "Messages", disabled: !partnerId && !authLoading },
  ];

  let navItemsToDisplay = commonNavItems; // Default, or for when role/user is not yet determined

  if (!authLoading && user) {
    if (currentRole === 'dominant') {
      navItemsToDisplay = domNavItems;
    } else if (currentRole === 'submissive') {
      navItemsToDisplay = subNavItems;
    }
    // If no role, commonNavItems remain
  }
  
  // Add admin link if user is admin
  if (APP_CONFIG.adminUserIds.includes(user?.id || '')) {
    // Check if admin item already exists to prevent duplicates if roles also add it
    if (!navItemsToDisplay.find(item => item.to === "/admin-testing")) {
      navItemsToDisplay = [...navItemsToDisplay, { to: "/admin-testing", icon: Settings, label: "Admin" }];
    }
  }


  const handleNavigation = (path: string) => {
    logger.log("Navigating to:", path);
    navigate(path);
  };

  const toggleMenu = () => {
    logger.log("Toggling mobile menu, current state:", isOpen);
    setIsOpen(!isOpen);
  };


  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 shadow-top-md z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItemsToDisplay.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
};

export default MobileNavbar;
