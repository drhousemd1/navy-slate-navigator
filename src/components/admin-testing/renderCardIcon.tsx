
import React from 'react';
import { 
  Activity, AlertCircle, AlignLeft, BarChart, Bell, 
  Book, Bookmark, Calendar, Clock, Cog, File, Heart, 
  Home, Image, Mail, Map, MessageCircle, Music, 
  PenSquare, Phone, Settings, ShoppingBag, Star, User
} from 'lucide-react';

interface RenderCardIconProps {
  iconUrl?: string;
  iconName?: string;
  iconColor?: string;
  fallbackIcon?: React.ReactNode;
}

export const renderCardIcon = ({
  iconUrl,
  iconName,
  iconColor = '#FFFFFF',
  fallbackIcon
}: RenderCardIconProps): React.ReactNode => {
  if (iconUrl) {
    return (
      <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
        <img 
          src={iconUrl} 
          alt="Icon" 
          className="w-full h-auto object-contain" 
          style={{ filter: `drop-shadow(0 0 2px rgba(0,0,0,0.5))` }}
        />
      </div>
    );
  }

  const IconComponent = getIconComponent(iconName);
  if (IconComponent) {
    return <IconComponent className="w-6 h-6" style={{ color: iconColor }} />;
  }

  return fallbackIcon || <Activity className="w-6 h-6 text-white" />;
};

const getIconComponent = (iconName?: string): React.ComponentType<any> | null => {
  if (!iconName) return null;

  const iconMap: Record<string, React.ComponentType<any>> = {
    'activity': Activity,
    'alert-circle': AlertCircle,
    'align-left': AlignLeft,
    'bar-chart': BarChart,
    'bell': Bell,
    'book': Book,
    'bookmark': Bookmark,
    'calendar': Calendar,
    'clock': Clock,
    'cog': Cog,
    'file': File,
    'heart': Heart,
    'home': Home,
    'image': Image,
    'mail': Mail,
    'map': Map,
    'message-circle': MessageCircle,
    'music': Music,
    'pen-square': PenSquare,
    'phone': Phone,
    'settings': Settings,
    'shopping-bag': ShoppingBag,
    'star': Star,
    'user': User
  };

  return iconMap[iconName] || null;
};
