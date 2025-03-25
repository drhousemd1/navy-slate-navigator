
import React from 'react';
import { Calendar, CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target } from 'lucide-react';

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
      default:
        return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
    }
  }
  
  return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
};

export default TaskIcon;
