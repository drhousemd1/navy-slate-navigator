
import React from 'react';
import { Grid3X3, Clock, Gift, Trophy, Bell, AlertCircle, Smile, Ban, Star, Heart } from 'lucide-react';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
}

const iconConfig = [
  { name: 'grid-3x3', Component: Grid3X3 },
  { name: 'clock', Component: Clock },
  { name: 'gift', Component: Gift },
  { name: 'trophy', Component: Trophy },
  { name: 'bell', Component: Bell },
  { name: 'alert-circle', Component: AlertCircle },
  { name: 'smile', Component: Smile },
  { name: 'ban', Component: Ban },
  { name: 'star', Component: Star },
  { name: 'heart', Component: Heart },
];

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({ 
  selectedIconName, 
  iconColor, 
  onSelectIcon 
}) => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {iconConfig.map(({ name, Component }) => (
        <div
          key={name}
          onClick={() => onSelectIcon(name)}
          className={`
            p-2 rounded-md cursor-pointer flex items-center justify-center border
            ${selectedIconName === name 
              ? 'border-[#FEF7CD] bg-navy shadow-[0_0_8px_2px_rgba(254,247,205,0.2)]'
              : 'border-light-navy bg-dark-navy hover:border-white'}
          `}
        >
          <Component style={{ color: iconColor }} className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
};

export default PredefinedIconsGrid;
