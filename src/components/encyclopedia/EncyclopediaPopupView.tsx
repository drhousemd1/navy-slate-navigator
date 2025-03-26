
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from 'lucide-react';
import HighlightedText from '../task/HighlightedText';

interface EncyclopediaPopupViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  imageUrl?: string | null;
  focalPointX?: number;
  focalPointY?: number;
  opacity?: number;
  titleColor?: string;
  highlightEffect?: boolean;
}

const EncyclopediaPopupView: React.FC<EncyclopediaPopupViewProps> = ({
  isOpen,
  onClose,
  title,
  content,
  imageUrl,
  focalPointX = 50,
  focalPointY = 50,
  opacity = 100,
  titleColor = '#FFFFFF',
  highlightEffect = false
}) => {
  const backgroundStyle = imageUrl ? {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: opacity / 100
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white p-0 max-w-full w-full h-full max-h-full flex flex-col inset-0 m-0 rounded-none absolute"
        style={{ transform: 'none', top: 0, left: 0, bottom: 0, right: 0 }}
      >
        {imageUrl && (
          <div 
            className="absolute inset-0 z-0" 
            style={backgroundStyle}
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 flex flex-col h-full p-6 overflow-y-auto">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-white hover:text-cyan-500 transition-colors rounded-full bg-navy/60 z-20"
            aria-label="Close encyclopedia entry"
          >
            <X size={24} />
          </button>
          
          <div className="max-w-3xl mx-auto w-full pt-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              <HighlightedText 
                text={title}
                highlight={highlightEffect}
                color={titleColor}
              />
            </h1>
            <div className="prose prose-invert max-w-none">
              {content.split('\n').map((paragraph, index) => (
                paragraph.trim() ? (
                  <p key={index} className="text-lg mb-4 text-white">
                    {paragraph}
                  </p>
                ) : <br key={index} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EncyclopediaPopupView;
