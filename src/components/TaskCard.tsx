
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Check, Calendar, Plus, Minus } from 'lucide-react';
import { Badge } from './ui/badge';

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  onEdit: () => void;
  onToggleCompletion?: (completed: boolean) => void;
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  icon_url?: string;
  priority?: 'low' | 'medium' | 'high';
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  points,
  completed = false,
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  onEdit,
  onToggleCompletion,
  frequency,
  frequency_count = 0,
  icon_url,
  priority = 'medium'
}) => {
  const generateTrackerCircles = () => {
    const circles = [];
    const total = frequency === 'daily' ? 7 : 4;
    
    for (let i = 0; i < total; i++) {
      circles.push(
        <div 
          key={i}
          className={`w-4 h-4 rounded-full border ${i < frequency_count ? 'bg-nav-active border-nav-active' : 'bg-transparent border-light-navy'}`}
        />
      );
    }
    
    return circles;
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'low':
        return 'bg-green-500';
      case 'medium':
      default:
        return 'bg-yellow-500';
    }
  };

  return (
    <Card className={`relative overflow-hidden border-light-navy ${!backgroundImage ? 'bg-navy' : ''}`}>
      {backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <Badge 
            className={`${getPriorityColor()} text-white font-bold capitalize px-3 py-1`}
            variant="default"
          >
            {priority}
          </Badge>
          
          {onToggleCompletion && (
            <div className="flex items-center gap-2">
              <Badge 
                className="bg-nav-active text-white font-bold flex items-center gap-1"
                variant="default"
              >
                {points > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(points)}
              </Badge>
              
              <Button
                variant="default"
                size="sm"
                className={`${completed ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                onClick={() => onToggleCompletion(!completed)}
              >
                {completed ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Completed
                  </span>
                ) : (
                  'Complete'
                )}
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-light-navy/30 flex items-center justify-center">
              {icon_url ? (
                <img src={icon_url} alt="Task icon" className="w-6 h-6" />
              ) : (
                <Calendar className="w-6 h-6 text-nav-active" />
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className={`text-xl font-semibold ${completed ? 'text-gray-400 line-through' : 'text-white'}`}>
              {title}
            </h3>
            <p className={`mt-1 text-sm ${completed ? 'text-gray-500 line-through' : 'text-light-navy'}`}>
              {description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          {frequency && (
            <div className="flex space-x-1 items-center">
              <Calendar className="h-4 w-4 text-light-navy mr-1" />
              <div className="flex space-x-1">
                {generateTrackerCircles()}
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
