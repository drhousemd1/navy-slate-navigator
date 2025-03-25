
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Check, Calendar, Star } from 'lucide-react';

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
  icon_url
}) => {
  // Generate circles for calendar tracker
  const generateTrackerCircles = () => {
    const circles = [];
    const total = frequency === 'daily' ? 7 : 4; // 7 days or 4 weeks
    
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

      <div className="relative z-10 flex flex-col p-4 md:p-6">
        <div className="flex items-start">
          {/* Icon with background shape on the far left */}
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-light-navy/30 flex items-center justify-center">
              {icon_url ? (
                <img src={icon_url} alt="Task icon" className="w-6 h-6" />
              ) : (
                <Calendar className="w-6 h-6 text-nav-active" />
              )}
            </div>
          </div>
          
          {/* Title and description stacked vertically */}
          <div className="flex-1">
            <h3 className={`text-xl font-semibold ${completed ? 'text-gray-400 line-through' : 'text-white'}`}>
              {title}
            </h3>
            <p className={`mt-1 text-sm ${completed ? 'text-gray-500 line-through' : 'text-light-navy'}`}>
              {description}
            </p>
          </div>
          
          {/* Points and Edit button */}
          <div className="flex items-center">
            <div className="flex items-center mr-3">
              <Star className="h-5 w-5 text-nav-active" />
              <span className="text-nav-active font-bold ml-1">{points}</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="text-light-navy hover:text-white hover:bg-light-navy"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          {/* Calendar tracker on the bottom left */}
          {frequency && (
            <div className="flex space-x-1 items-center">
              <Calendar className="h-4 w-4 text-light-navy mr-1" />
              <div className="flex space-x-1">
                {generateTrackerCircles()}
              </div>
            </div>
          )}
          
          {/* Mark complete button */}
          {onToggleCompletion && (
            <Button
              variant="outline"
              size="sm"
              className={`${completed ? 'bg-green-600/20 border-green-600/30 text-green-500' : 'bg-navy border-light-navy text-light-navy'}`}
              onClick={() => onToggleCompletion(!completed)}
            >
              {completed ? (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Completed
                </span>
              ) : (
                'Mark Complete'
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
