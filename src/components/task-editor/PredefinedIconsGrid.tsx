
import React, { useState } from 'react';
import { predefinedIcons } from './IconSelector';
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';
import IconBrowserModal from './IconBrowserModal';
import RecentIcons from './RecentIcons';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  recentIcons?: string[];
}

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({ 
  selectedIconName, 
  iconColor, 
  onSelectIcon,
  recentIcons = []
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="border-2 border-light-navy rounded-lg p-4">
      <p className="text-white mb-3">Presets</p>
      
      <Button 
        type="button"
        variant="secondary" 
        onClick={handleOpenModal}
        className="w-full bg-light-navy text-white hover:bg-navy flex items-center justify-center gap-2"
      >
        <Search className="h-4 w-4" />
        Browse Icons
      </Button>
      
      <IconBrowserModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelectIcon={onSelectIcon}
        iconColor={iconColor}
      />
      
      <RecentIcons 
        recentIcons={recentIcons}
        iconColor={iconColor}
        onSelectIcon={onSelectIcon}
        icons={predefinedIcons}
      />
    </div>
  );
};

export default PredefinedIconsGrid;
