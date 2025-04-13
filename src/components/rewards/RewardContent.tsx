
import React from 'react';
import TaskIcon from '../task/TaskIcon';
import HighlightedText from '../task/HighlightedText';

interface RewardContentProps {
  description: string;
  supply: number;
  cost: number;
  iconName?: string;
  iconColor?: string;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
}

export const RewardContent: React.FC<RewardContentProps> = ({
  description,
  iconName,
  iconColor,
  highlight_effect,
  title_color,
  subtext_color
}) => {
  return (
    <div className="flex items-start mb-auto">
      <div className="mr-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-200">
          <TaskIcon 
            icon_name={iconName || 'gift'} 
            icon_color={iconColor || '#4CAF50'} 
          />
        </div>
      </div>
      
      <div className="flex flex-col">
        {highlight_effect ? (
          <div className="inline-block max-w-fit mt-1 text-sm">
            <HighlightedText
              text={description}
              highlight={true}
              color={subtext_color || '#666'}
            />
          </div>
        ) : (
          <div className="text-sm mt-1" style={{ color: subtext_color || '#666' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardContent;
