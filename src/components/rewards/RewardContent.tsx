
import React from 'react';
import TaskIcon from '../task/TaskIcon';
import HighlightedText from '../task/HighlightedText';

interface RewardContentProps {
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  highlight_effect: boolean;
  title_color: string;
  subtext_color: string;
}

const RewardContent: React.FC<RewardContentProps> = ({
  title,
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
            icon_name={iconName} 
            icon_color={iconColor} 
          />
        </div>
      </div>
      
      <div className="flex flex-col">
        {highlight_effect ? (
          <div className="inline-flex flex-col items-start">
            <div className="inline-block max-w-fit font-semibold">
              <HighlightedText 
                text={title}
                highlight={true}
                color={title_color}
              />
            </div>
            <div className="inline-block max-w-fit mt-1 text-sm">
              <HighlightedText
                text={description}
                highlight={true}
                color={subtext_color}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="font-semibold" style={{ color: title_color }}>
              {title}
            </div>
            <div className="text-sm mt-1" style={{ color: subtext_color }}>
              {description}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RewardContent;
