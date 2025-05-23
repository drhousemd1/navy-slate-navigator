
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import HighlightedText from '../task/HighlightedText';
import EncyclopediaPopupView from './EncyclopediaPopupView';

interface EncyclopediaTileProps {
  title: string;
  subtext: string;
  popupText: string;
  imageUrl?: string | null;
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
    isItalic?: boolean;
    fontSize?: string;
  };
  onFormatSelection?: (selection: { start: number; end: number }) => void;
  formattedSections?: Array<{
    start: number;
    end: number;
    formatting: {
      isBold?: boolean;
      isUnderlined?: boolean;
      isItalic?: boolean;
      fontSize?: string;
    }
  }>;
}

const EncyclopediaTile: React.FC<EncyclopediaTileProps> = ({ 
  title, 
  subtext, 
  popupText,
  imageUrl,
  focalPointX = 50,
  focalPointY = 50,
  opacity = 100,
  popupOpacity,
  titleColor = '#FFFFFF',
  subtextColor = '#D1D5DB',
  highlightEffect = false,
  popupTextFormatting,
  onFormatSelection,
  formattedSections = []
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
        className="relative overflow-hidden rounded-lg border border-light-navy h-48 bg-navy"
        onClick={handleOpenPopup}
      >
        {/* Background image with customized focal point and opacity */}
        {imageUrl && (
          <div 
            className="absolute inset-0 z-0" 
            style={backgroundStyle} 
          />
        )}
        
        {/* Content overlay */}
        <div className="absolute inset-0 z-10 flex flex-col p-4 bg-gradient-to-t from-dark-navy/90 to-transparent">
          
          {/* Title */}
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold mb-1">
              <HighlightedText
                text={title}
                highlight={highlightEffect}
                color={titleColor}
              />
            </h3>
          </div>
          
          {/* Description directly below title */}
          <p className="text-sm">
            <HighlightedText
              text={subtext}
              highlight={highlightEffect}
              color={subtextColor}
            />
          </p>
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
          formattedSections={formattedSections}
        />
      )}
    </>
  );
};

export default EncyclopediaTile;
