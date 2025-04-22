
import React from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import { Card } from '@/components/ui/card';
import { getIconComponent } from '@/pages/Punishments';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface PunishmentsListProps {
  punishments: PunishmentData[];
  globalCarouselTimer: number;
  globalCarouselIndex: number;
}

const PunishmentsList: React.FC<PunishmentsListProps> = ({
  punishments,
  globalCarouselTimer,
  globalCarouselIndex,
}) => {
  return (
    <div className="space-y-4">
      {punishments.map((punishment) => (
        <Card key={punishment.id} className="bg-dark-navy border-2 border-[#00f0ff] overflow-hidden">
          <div className="relative p-4">
            {punishment.background_image_url && (
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: `url(${punishment.background_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `${punishment.focal_point_x || 50}% ${punishment.focal_point_y || 50}%`,
                  opacity: (punishment.background_opacity || 100) / 100,
                }}
              />
            )}
            
            <div className="flex justify-between items-center mb-3 relative z-10">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center mr-3">
                  {punishment.icon_name && getIconComponent(punishment.icon_name)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{punishment.title}</h3>
                  {punishment.description && (
                    <p className="text-sm text-gray-400">{punishment.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-red-600 text-white font-bold px-3 py-1 rounded">
                  -{punishment.points}
                </div>
                <Button 
                  size="sm" 
                  className="bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PunishmentsList;
