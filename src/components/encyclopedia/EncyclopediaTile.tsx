
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Edit } from 'lucide-react';

interface EncyclopediaTileProps {
  title: string;
  subtext: string;
  showEditIcon?: boolean;
  onEdit?: () => void;
}

const EncyclopediaTile: React.FC<EncyclopediaTileProps> = ({ 
  title, 
  subtext, 
  showEditIcon = false, 
  onEdit 
}) => {
  return (
    <Card className="bg-navy border border-light-navy hover:border-cyan-800 transition-colors relative">
      <CardContent className="p-4">
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-gray-300 text-sm">{subtext}</p>
        
        {showEditIcon && (
          <button 
            onClick={onEdit}
            className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-cyan-500 transition-colors"
            aria-label="Edit encyclopedia entry"
          >
            <Edit size={16} />
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default EncyclopediaTile;
