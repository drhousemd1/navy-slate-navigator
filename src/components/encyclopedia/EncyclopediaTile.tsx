
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Edit } from 'lucide-react';

interface EncyclopediaTileProps {
  title: string;
  subtext: string;
  showEditIcon?: boolean;
  onEdit?: () => void;
  imageUrl?: string | null;
  focalPointX?: number;
  focalPointY?: number;
  opacity?: number;
}

const EncyclopediaTile: React.FC<EncyclopediaTileProps> = ({ 
  title, 
  subtext, 
  showEditIcon = false, 
  onEdit,
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
    <Card className="bg-navy border border-light-navy hover:border-cyan-800 transition-colors relative overflow-hidden h-[180px]">
      {imageUrl && (
        <div 
          className="absolute inset-0 z-0" 
          style={backgroundStyle}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 h-full">
        <CardContent className="p-4 h-full flex flex-col">
          <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
          <p className="text-gray-300 text-sm flex-grow">{subtext}</p>
          
          {showEditIcon && (
            <button 
              onClick={onEdit}
              className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-cyan-500 transition-colors bg-navy/60 rounded-full"
              aria-label="Edit encyclopedia entry"
            >
              <Edit size={16} />
            </button>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default EncyclopediaTile;
