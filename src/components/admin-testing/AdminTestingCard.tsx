
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import AdminTestingCardEditModal from './AdminTestingCardEditModal';

export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  icon_url?: string;
  background_images?: (string | null)[];
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  priority?: 'low' | 'medium' | 'high';
  carousel_interval?: number;
}

interface AdminTestingCardProps {
  card: AdminTestingCardData;
  onSave: (data: AdminTestingCardData) => void;
}

const AdminTestingCard: React.FC<AdminTestingCardProps> = ({ card, onSave }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [intervalTime, setIntervalTime] = useState(card.carousel_interval || 5000);

  const images = card.background_images || [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (images.length > 0 ? (prev + 1) % images.length : 0));
    }, intervalTime);
    return () => clearInterval(timer);
  }, [images, intervalTime]);

  return (
    <>
      <Card className="relative overflow-hidden group w-full max-w-md mx-auto border border-slate-600">
        {images.length > 0 && images[currentImageIndex] && (
          <img
            src={images[currentImageIndex] || ''}
            alt="background"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100"
          />
        )}
        <div className="relative z-10 p-4 space-y-2 bg-black/50">
          <h3 className="text-xl font-semibold" style={{ color: card.title_color || '#FFFFFF' }}>
            {card.title}
          </h3>
          <p className="text-sm" style={{ color: card.subtext_color || '#CCCCCC' }}>
            {card.description}
          </p>
          <Button
            size="icon"
            variant="ghost"
            className="absolute bottom-2 right-2 text-white hover:bg-slate-800"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="w-5 h-5" />
          </Button>
        </div>
      </Card>
      <AdminTestingCardEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        cardData={card}
        onSave={onSave}
      />
    </>
  );
};

export default AdminTestingCard;
