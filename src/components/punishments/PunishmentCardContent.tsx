
import React from 'react';
import { Skull } from 'lucide-react';
import TaskIcon from '../task/TaskIcon';
import HighlightedText from '../task/HighlightedText';
import CardText from '../common/CardText';

interface PunishmentCardContentProps {
  icon_name?: string;
  icon_color?: string;
  title: string;
  description: string;
  title_color: string;
  subtext_color: string;
  highlight_effect: boolean;
  background_image_url?: string;
  background_opacity?: number;
  showIcon?: boolean;
}

const PunishmentCardContent: React.FC<PunishmentCardContentProps> = ({
  icon_name,
  icon_color = '#ea384c',
  title,
  description,
  title_color,
  subtext_color,
  highlight_effect,
  background_image_url,
  background_opacity,
  showIcon = true
}) => {
  const hasVisibleImage = !!background_image_url && background_opacity !== 0;
  // Use the provided icon color for the background
  const iconBgColor = '#ea384c'; // Keep red background for the circle

  return (
    <div className="flex items-start mb-auto">
      {showIcon && (
        <div className="mr-4 flex-shrink-0">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center" 
            style={{ backgroundColor: iconBgColor }}
          >
            {icon_name ? (
              <TaskIcon 
                icon_name={icon_name.startsWith('custom:') ? undefined : icon_name}
                icon_url={icon_name.startsWith('custom:') ? icon_name.slice(7) : undefined}
                icon_color={icon_color} 
                className="w-6 h-6"
              />
            ) : (
              <Skull 
                className="w-6 h-6" 
                style={{ color: icon_color }} 
              />
            )}
          </div>
        </div>
      )}
      
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
            <div className="text-xl font-semibold">
              <CardText text={title} color={title_color} highlight={false} hasImage={hasVisibleImage} surface="--navy" />
            </div>
            <div className="text-sm mt-1">
              <CardText text={description} color={subtext_color} highlight={false} hasImage={hasVisibleImage} surface="--navy" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PunishmentCardContent;
