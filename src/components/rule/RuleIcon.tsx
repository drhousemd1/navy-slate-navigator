
import React from 'react';
import { 
  Calendar, CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target, 
  Activity, AlarmClock, Bell, Camera, Music, Cloud, Home, User, File, Gift,
  Zap, Store, Book, Sun, Moon, Globe, Smile, Map, Settings, ShoppingCart,
  CreditCard, Truck, Package, Phone, Mail, MessageSquare, Send, Search, Trash,
  Edit, Eye, Plus, Minus, Clock, Video, Image, Folder, Tag, Share, Link,
  Bookmark, Award, Flag, Info, AlertCircle, AlertTriangle, BellRing, Skull, Coins
} from 'lucide-react';

interface RuleIconProps {
  icon_url?: string;
  icon_name?: string;
  icon_color?: string;
  className?: string;
}

const RuleIcon: React.FC<RuleIconProps> = ({ 
  icon_url, 
  icon_name, 
  icon_color = '#9b87f5',
  className = "w-6 h-6"
}) => {
  console.log('RuleIcon rendering with icon_color:', icon_color);
  
  if (icon_url) {
    return <img src={icon_url} alt="Rule icon" className={className} />;
  }
  
  if (icon_name) {
    // Ensure color is applied both through the color prop and style
    const iconProps = {
      className,
      color: icon_color,
      style: { color: icon_color }
    };

    switch (icon_name) {
      case 'CheckSquare':
        return <CheckSquare {...iconProps} />;
      case 'BookOpen':
        return <BookOpen {...iconProps} />;
      case 'Coffee':
        return <Coffee {...iconProps} />;
      case 'Dumbbell':
        return <Dumbbell {...iconProps} />;
      case 'Star':
        return <Star {...iconProps} />;
      case 'Heart':
        return <Heart {...iconProps} />;
      case 'Trophy':
        return <Trophy {...iconProps} />;
      case 'Target':
        return <Target {...iconProps} />;
      case 'Activity':
        return <Activity {...iconProps} />;
      case 'AlarmClock':
        return <AlarmClock {...iconProps} />;
      case 'Bell':
        return <Bell {...iconProps} />;
      case 'Calendar':
        return <Calendar {...iconProps} />;
      case 'Camera':
        return <Camera {...iconProps} />;
      case 'Music':
        return <Music {...iconProps} />;
      case 'Cloud':
        return <Cloud {...iconProps} />;
      case 'Home':
        return <Home {...iconProps} />;
      case 'User':
        return <User {...iconProps} />;
      case 'File':
        return <File {...iconProps} />;
      case 'Gift':
        return <Gift {...iconProps} />;
      case 'Zap':
        return <Zap {...iconProps} />;
      case 'Store':
        return <Store {...iconProps} />;
      case 'Book':
        return <Book {...iconProps} />;
      case 'Sun':
        return <Sun {...iconProps} />;
      case 'Moon':
        return <Moon {...iconProps} />;
      case 'Globe':
        return <Globe {...iconProps} />;
      case 'Smile':
        return <Smile {...iconProps} />;
      case 'Map':
        return <Map {...iconProps} />;
      case 'Settings':
        return <Settings {...iconProps} />;
      case 'ShoppingCart':
        return <ShoppingCart {...iconProps} />;
      case 'CreditCard':
        return <CreditCard {...iconProps} />;
      case 'Truck':
        return <Truck {...iconProps} />;
      case 'Package':
        return <Package {...iconProps} />;
      case 'Phone':
        return <Phone {...iconProps} />;
      case 'Mail':
        return <Mail {...iconProps} />;
      case 'MessageSquare':
        return <MessageSquare {...iconProps} />;
      case 'Send':
        return <Send {...iconProps} />;
      case 'Search':
        return <Search {...iconProps} />;
      case 'Trash':
        return <Trash {...iconProps} />;
      case 'Edit':
        return <Edit {...iconProps} />;
      case 'Eye':
        return <Eye {...iconProps} />;
      case 'Plus':
        return <Plus {...iconProps} />;
      case 'Minus':
        return <Minus {...iconProps} />;
      case 'Clock':
        return <Clock {...iconProps} />;
      case 'Video':
        return <Video {...iconProps} />;
      case 'Image':
        return <Image {...iconProps} />;
      case 'Folder':
        return <Folder {...iconProps} />;
      case 'Tag':
        return <Tag {...iconProps} />;
      case 'Share':
        return <Share {...iconProps} />;
      case 'Link':
        return <Link {...iconProps} />;
      case 'Bookmark':
        return <Bookmark {...iconProps} />;
      case 'Award':
        return <Award {...iconProps} />;
      case 'Flag':
        return <Flag {...iconProps} />;
      case 'Info':
        return <Info {...iconProps} />;
      case 'AlertCircle':
        return <AlertCircle {...iconProps} />;
      case 'AlertTriangle':
        return <AlertTriangle {...iconProps} />;
      case 'BellRing':
        return <BellRing {...iconProps} />;
      case 'Skull':
        return <Skull {...iconProps} />;
      case 'Coins':
        return <Coins {...iconProps} />;
      default:
        return <Calendar {...iconProps} />;
    }
  }
  
  // Default icon with color applied
  return <Calendar className={className} color={icon_color} style={{ color: icon_color }} />;
};

export default RuleIcon;
