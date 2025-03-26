
import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Edit } from 'lucide-react';
import EncyclopediaPopupView from './EncyclopediaPopupView';
import HighlightedText from '../task/HighlightedText';

interface EncyclopediaTileProps {
  title: string;
  subtext: string;
  popupText?: string;
  showEditIcon?: boolean;
  onEdit?: () => void;
  imageUrl?: string | null;
  focalPointX?: number;
  focalPointY?: number;
  opacity?: number;
  titleColor?: string;
  subtextColor?: string;
  highlightEffect?: boolean;
}

const EncyclopediaTile: React.FC<EncyclopediaTileProps> = ({ 
  title, 
  subtext, 
  popupText,
  showEditIcon = false, 
  onEdit,
  imageUrl,
  focalPointX = 50,
  focalPointY = 50,
  opacity = 100,
  titleColor = '#FFFFFF',
  subtextColor = '#D1D5DB',
  highlightEffect = false
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const backgroundStyle = imageUrl ? {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: opacity / 100
  } : undefined;

  const handleClick = () => {
    if (popupText) {
      setIsPopupOpen(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the tile click
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <>
      <Card 
        className="bg-navy border border-light-navy hover:border-cyan-800 transition-colors relative overflow-hidden h-[180px] cursor-pointer"
        onClick={handleClick}
      >
        {imageUrl && (
          <div 
            className="absolute inset-0 z-0" 
            style={backgroundStyle}
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 h-full">
          <CardContent className="p-4 h-full flex flex-col">
            <h3 className="text-lg font-medium mb-2">
              <HighlightedText 
                text={title}
                highlight={highlightEffect}
                color={titleColor}
              />
            </h3>
            <p className="text-sm flex-grow">
              <HighlightedText 
                text={subtext}
                highlight={highlightEffect}
                color={subtextColor}
              />
            </p>
            
            {showEditIcon && (
              <button 
                onClick={handleEditClick}
                className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-cyan-500 transition-colors bg-navy/60 rounded-full"
                aria-label="Edit encyclopedia entry"
              >
                <Edit size={16} />
              </button>
            )}
          </CardContent>
        </div>
      </Card>

      {popupText && (
        <EncyclopediaPopupView
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          title={title}
          content={popupText}
          imageUrl={imageUrl}
          focalPointX={focalPointX}
          focalPointY={focalPointY}
          opacity={opacity}
          titleColor={titleColor}
          highlightEffect={highlightEffect}
        />
      )}
    </>
  );
};

export default EncyclopediaTile;
