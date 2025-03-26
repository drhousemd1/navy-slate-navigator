
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import HighlightedText from '../task/HighlightedText';
import EncyclopediaPopupView from './EncyclopediaPopupView';
import { Edit } from 'lucide-react';

interface EncyclopediaTileProps {
  title: string;
  subtext: string;
  popupText: string;
  imageUrl?: string | null;
  onEdit?: () => void;
  showEditIcon?: boolean;
  focalPointX?: number;
  focalPointY?: number;
  opacity?: number;
  popupOpacity?: number;
  titleColor?: string;
  subtextColor?: string;
  highlightEffect?: boolean;
  popupTextFormatting?: {
    isBold?: boolean;
    isUnderlined?: boolean;
    fontSize?: string;
  };
  onFormatSelection?: (selection: { start: number; end: number }) => void;
}

const EncyclopediaTile: React.FC<EncyclopediaTileProps> = ({ 
  title, 
  subtext, 
  popupText,
  imageUrl,
  onEdit,
  showEditIcon = false,
  focalPointX = 50,
  focalPointY = 50,
  opacity = 100,
  popupOpacity,
  titleColor = '#FFFFFF',
  subtextColor = '#D1D5DB',
  highlightEffect = false,
  popupTextFormatting,
  onFormatSelection
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const backgroundStyle = imageUrl ? {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: opacity / 100
  } : undefined;
  
  const handleOpenPopup = () => {
    setIsPopupOpen(true);
  };
  
  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <>
      <div 
        className={cn(
          "group relative overflow-hidden rounded-lg border border-light-navy cursor-pointer h-48 transition-all duration-300 bg-navy hover:shadow-lg",
          imageUrl ? "" : ""
        )}
        onClick={handleOpenPopup}
      >
        {/* Background image with customized focal point and opacity */}
        {imageUrl && (
          <div 
            className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110" 
            style={backgroundStyle} 
          />
        )}
        
        {/* Content overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-t from-dark-navy/90 to-transparent">
          
          {/* Title and edit button */}
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold mb-1 group-hover:underline">
              <HighlightedText
                text={title}
                highlight={highlightEffect}
                color={titleColor}
              />
            </h3>
            
            {showEditIcon && onEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white hover:text-nav-active p-1 rounded"
                aria-label={`Edit ${title}`}
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Description */}
          <div className="mt-auto">
            <p 
              className="text-sm"
              style={{ color: subtextColor }}
            >
              {subtext}
            </p>
          </div>
        </div>
      </div>
      
      {/* Popup view */}
      {isPopupOpen && (
        <EncyclopediaPopupView
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
          title={title}
          content={popupText}
          imageUrl={imageUrl}
          focalPointX={focalPointX}
          focalPointY={focalPointY}
          opacity={popupOpacity || opacity}
          titleColor={titleColor}
          highlightEffect={highlightEffect}
          textFormatting={popupTextFormatting}
          onFormatSelection={onFormatSelection}
        />
      )}
    </>
  );
};

export default EncyclopediaTile;
