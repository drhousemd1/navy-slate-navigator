
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from 'lucide-react';

interface EncyclopediaPopupViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  imageUrl?: string | null;
  focalPointX?: number;
  focalPointY?: number;
  opacity?: number;
}

const EncyclopediaPopupView: React.FC<EncyclopediaPopupViewProps> = ({
  isOpen,
  onClose,
  title,
  content,
  imageUrl,
  focalPointX = 50,
  focalPointY = 50,
  opacity = 100
}) => {
  const backgroundStyle = imageUrl ? {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: opacity / 100
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white p-0 max-w-full w-screen h-screen max-h-screen flex flex-col relative">
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
            className="absolute right-4 top-4 p-2 text-white hover:text-cyan-500 transition-colors rounded-full bg-navy/60"
            aria-label="Close encyclopedia entry"
          >
            <X size={24} />
          </button>
          
          <div className="max-w-3xl mx-auto w-full pt-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{title}</h1>
            <div className="prose prose-invert max-w-none">
              {content.split('\n').map((paragraph, index) => (
                paragraph.trim() ? <p key={index} className="text-lg mb-4">{paragraph}</p> : <br key={index} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EncyclopediaPopupView;
