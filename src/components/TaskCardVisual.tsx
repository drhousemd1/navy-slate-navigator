
import React from 'react';
import { Card } from './ui/card';
import PriorityBadge from './task/PriorityBadge';
import TaskIcon from './task/TaskIcon';
import HighlightedText from './task/HighlightedText';
import PointsBadge from './task/PointsBadge';

interface TaskCardVisualProps {
  title: string;
  description: string;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  priority?: 'low' | 'medium' | 'high';
  points: number;
  icon_url?: string;
  icon_name?: string;
  title_color?: string;
  subtext_color?: string;
  icon_color?: string;
}

const TaskCardVisual: React.FC<TaskCardVisualProps> = ({
  title,
  description,
  background_image_url,
  background_opacity = 100,
  focal_point_x = 50,
  focal_point_y = 50,
  priority = 'medium',
  points,
  icon_url,
  icon_name,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  icon_color = '#9b87f5'
}) => {
  return (
    <Card className={`relative overflow-hidden border-2 border-[#00f0ff] ${!background_image_url ? 'bg-navy' : ''}`}>
      {background_image_url && (
        <div 
          className="absolute inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${background_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
            opacity: background_opacity / 100,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <PriorityBadge priority={priority} />
          <PointsBadge points={points} />
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
