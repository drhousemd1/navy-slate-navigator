
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Calendar, Box } from 'lucide-react';
import TaskIcon from './task/TaskIcon';
import PointsBadge from './task/PointsBadge';

interface RewardCardProps {
  title: string;
  description: string;
  cost: number;
  supply: number;
  iconName?: string;
  iconColor?: string;
}

const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  cost,
  supply,
  iconName = 'Gift',
  iconColor = '#9b87f5'
}) => {
  return (
    <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          {/* Supply indicator - updated to match the image */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 text-white font-bold rounded-full px-2 py-0.5 flex items-center gap-1">
              <Box className="h-4 w-4" />
              <span>{supply}</span>
            </div>
            
            {supply > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="p-0 h-7 text-white hover:bg-nav-active/20"
              >
                Use
              </Button>
            )}
          </div>
          
          {/* Cost indicator */}
          <div className="flex items-center gap-2">
            <PointsBadge points={-cost} />
            <Button
              variant="default"
              size="sm"
              className="bg-nav-active text-white hover:bg-nav-active/90 h-7"
            >
              Buy
            </Button>
          </div>
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
              <TaskIcon 
                icon_name={iconName} 
                icon_color={iconColor} 
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-semibold text-white">
              {title}
            </h3>
            
            <div className="text-sm mt-1 text-[#8E9196]">
              {description}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          {/* Calendar tracker placeholder */}
          <div className="flex space-x-1 items-center">
            <Calendar className="h-4 w-4 mr-1 text-[#7E69AB]" />
            <div className="flex space-x-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="w-4 h-4 rounded-full border border-[#7E69AB] bg-transparent"
                />
              ))}
            </div>
          </div>
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RewardCard;
