
import React from 'react';
import { 
  Calendar, CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target,
  BarChart, BellRing, Book, Bookmark, Box, Briefcase, Building, Cake,
  Camera, Car, Compass, CreditCard, Crown, Droplet, Edit, Film, Flag, Flame,
  Flower, Gift, Globe, Headphones, Home, Image, Key, Laptop, Leaf, Lightbulb,
  Link, Lock, Mail, Map, MapPin, Music, Package, Phone, Plane, Plant, Printer,
  ShoppingBag, ShoppingCart, Smartphone, Smile, Snowflake, Sun, Sunset, Tag,
  Truck, Umbrella, Video, Watch, Zap
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
      case 'CheckSquare': return <CheckSquare className="w-6 h-6" style={{ color: icon_color }} />;
      case 'BookOpen': return <BookOpen className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Coffee': return <Coffee className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Dumbbell': return <Dumbbell className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Star': return <Star className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Heart': return <Heart className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Trophy': return <Trophy className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Target': return <Target className="w-6 h-6" style={{ color: icon_color }} />;
      case 'BarChart': return <BarChart className="w-6 h-6" style={{ color: icon_color }} />;
      case 'BellRing': return <BellRing className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Book': return <Book className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Bookmark': return <Bookmark className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Box': return <Box className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Briefcase': return <Briefcase className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Building': return <Building className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Cake': return <Cake className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Camera': return <Camera className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Car': return <Car className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Compass': return <Compass className="w-6 h-6" style={{ color: icon_color }} />;
      case 'CreditCard': return <CreditCard className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Crown': return <Crown className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Droplet': return <Droplet className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Edit': return <Edit className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Film': return <Film className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Flag': return <Flag className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Flame': return <Flame className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Flower': return <Flower className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Gift': return <Gift className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Globe': return <Globe className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Headphones': return <Headphones className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Home': return <Home className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Image': return <Image className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Key': return <Key className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Laptop': return <Laptop className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Leaf': return <Leaf className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Lightbulb': return <Lightbulb className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Link': return <Link className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Lock': return <Lock className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Mail': return <Mail className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Map': return <Map className="w-6 h-6" style={{ color: icon_color }} />;
      case 'MapPin': return <MapPin className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Music': return <Music className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Package': return <Package className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Phone': return <Phone className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Plane': return <Plane className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Plant': return <Plant className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Printer': return <Printer className="w-6 h-6" style={{ color: icon_color }} />;
      case 'ShoppingBag': return <ShoppingBag className="w-6 h-6" style={{ color: icon_color }} />;
      case 'ShoppingCart': return <ShoppingCart className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Smartphone': return <Smartphone className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Smile': return <Smile className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Snowflake': return <Snowflake className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Sun': return <Sun className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Sunset': return <Sunset className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Tag': return <Tag className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Truck': return <Truck className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Umbrella': return <Umbrella className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Video': return <Video className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Watch': return <Watch className="w-6 h-6" style={{ color: icon_color }} />;
      case 'Zap': return <Zap className="w-6 h-6" style={{ color: icon_color }} />;
      default: return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
    }
  }
  
  return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
};

export default TaskIcon;
