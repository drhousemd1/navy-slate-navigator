
import React from 'react';
import { Skull } from 'lucide-react';
import TaskIcon from '../task/TaskIcon';
import HighlightedText from '../task/HighlightedText';

interface PunishmentCardContentProps {
  icon_name?: string;
  icon_color?: string;
  title: string;
  description: string;
  title_color: string;
  subtext_color: string;
  highlight_effect: boolean;
}

const PunishmentCardContent: React.FC<PunishmentCardContentProps> = ({
  icon_name,
  icon_color = '#ea384c',
  title,
  description,
  title_color,
  subtext_color,
  highlight_effect
}) => {
  return (
    <div className="flex items-start mb-auto">
      <div className="mr-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: icon_color }}>
          {icon_name ? (
            <TaskIcon 
              icon_name={icon_name} 
              icon_color={icon_color} 
              className="h-5 w-5 text-white"
            />
          ) : (
            <Skull className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        {highlight_effect ? (
          <div className="inline-flex flex-col items-start">
            <div className="inline-block max-w-fit text-xl font-semibold">
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
            <div className="text-xl font-semibold" style={{ color: title_color }}>
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

export default PunishmentCardContent;
