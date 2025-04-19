
import React from 'react';
import { Card } from './ui/card';
import PriorityBadge from './task/PriorityBadge';
import TaskIcon from './task/TaskIcon';
import HighlightedText from './task/HighlightedText';

interface TaskCardVisualProps {
  title: string;
  description: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  priority?: 'low' | 'medium' | 'high';
  icon_url?: string;
  icon_name?: string;
  title_color?: string;
  subtext_color?: string;
  icon_color?: string;
}

const TaskCardVisual: React.FC<TaskCardVisualProps> = ({
  title,
  description,
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  priority = 'medium',
  icon_url,
  icon_name,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  icon_color = '#9b87f5'
}) => {
  return (
    <Card className={`relative overflow-hidden border-2 border-[#00f0ff] ${!backgroundImage ? 'bg-navy' : ''}`}>
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
          <PriorityBadge priority={priority} />
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
              <TaskIcon 
                icon_url={icon_url} 
                icon_name={icon_name} 
                icon_color={icon_color} 
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-semibold inline-block">
              <HighlightedText 
                text={title} 
                highlight={false} 
                color={title_color} 
              />
            </h3>
            
            <div className="text-sm mt-1 inline-block">
              <HighlightedText 
                text={description} 
                highlight={false} 
                color={subtext_color} 
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TaskCardVisual;
