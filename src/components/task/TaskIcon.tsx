
import React from 'react';
import { 
  Calendar, CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target, 
  Activity, AlarmClock, Bell, Camera, Music, Cloud, Home, User, File, Gift,
  Zap, Store, Book, Sun, Moon, Globe, Smile, Map, Settings, ShoppingCart,
  CreditCard, Truck, Package, Phone, Mail, MessageSquare, Send, Search, Trash,
  Edit, Eye, Plus, Minus, Clock, Video, Image, Folder, Tag, Share, Link,
  Bookmark, Award, Flag, Info, AlertCircle, AlertTriangle, BellRing
} from 'lucide-react';

interface TaskIconProps {
  icon_url?: string;
  icon_name?: string;
  icon_color?: string;
}

const TaskIcon: React.FC<TaskIconProps> = ({ 
  icon_url, 
  icon_name, 
  icon_color = '#9b87f5' 
}) => {
  if (icon_url) {
    return <img src={icon_url} alt="Task icon" className="w-6 h-6" />;
  }
  
  if (icon_name) {
    switch (icon_name) {
      case 'CheckSquare':
        return <CheckSquare className="w-6 h-6" style={{ color: icon_color }} />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Coffee':
        return <Coffee className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Dumbbell':
        return <Dumbbell className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Star':
        return <Star className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Heart':
        return <Heart className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Trophy':
        return <Trophy className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Target':
        return <Target className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Activity':
        return <Activity className="w-6 h-6" style={{ color: icon_color }} />;
      case 'AlarmClock':
        return <AlarmClock className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Bell':
        return <Bell className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Calendar':
        return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Camera':
        return <Camera className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Music':
        return <Music className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Cloud':
        return <Cloud className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Home':
        return <Home className="w-6 h-6" style={{ color: icon_color }} />;
      case 'User':
        return <User className="w-6 h-6" style={{ color: icon_color }} />;
      case 'File':
        return <File className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Gift':
        return <Gift className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Zap':
        return <Zap className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Store':
        return <Store className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Book':
        return <Book className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Sun':
        return <Sun className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Moon':
        return <Moon className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Globe':
        return <Globe className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Smile':
        return <Smile className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Map':
        return <Map className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Settings':
        return <Settings className="w-6 h-6" style={{ color: icon_color }} />;
      case 'ShoppingCart':
        return <ShoppingCart className="w-6 h-6" style={{ color: icon_color }} />;
      case 'CreditCard':
        return <CreditCard className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Truck':
        return <Truck className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Package':
        return <Package className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Phone':
        return <Phone className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Mail':
        return <Mail className="w-6 h-6" style={{ color: icon_color }} />;
      case 'MessageSquare':
        return <MessageSquare className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Send':
        return <Send className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Search':
        return <Search className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Trash':
        return <Trash className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Edit':
        return <Edit className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Eye':
        return <Eye className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Plus':
        return <Plus className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Minus':
        return <Minus className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Clock':
        return <Clock className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Video':
        return <Video className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Image':
        return <Image className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Folder':
        return <Folder className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Tag':
        return <Tag className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Share':
        return <Share className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Link':
        return <Link className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Bookmark':
        return <Bookmark className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Award':
        return <Award className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Flag':
        return <Flag className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Info':
        return <Info className="w-6 h-6" style={{ color: icon_color }} />;
      case 'AlertCircle':
        return <AlertCircle className="w-6 h-6" style={{ color: icon_color }} />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-6 h-6" style={{ color: icon_color }} />;
      case 'BellRing':
        return <BellRing className="w-6 h-6" style={{ color: icon_color }} />;
      default:
        return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
    }
  }
  
  return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
};

export default TaskIcon;
