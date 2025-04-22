import React from 'react';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
}

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({
  selectedIconName,
  iconColor,
  onSelectIcon,
}) => {
  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.keys(PredefinedIcons).map((iconName) => (
        <button
          key={iconName}
          onClick={() => handleIconSelect(iconName)}
          className={`p-3 rounded-lg flex items-center justify-center border-2 border-transparent transition-colors duration-200 ${selectedIconName === iconName ? 'border-blue-500' : 'hover:bg-gray-700'}`}
        >
          <img
            src={`/icons/${iconName}.svg`}
            alt={`${iconName} Icon`}
            style={{ backgroundColor: iconColor }}
            className="h-8 w-8 object-contain"
          />
        </button>
      ))}
    </div>
  );
};

// Define the PredefinedIcons object here
const PredefinedIcons: { [key: string]: string } = {
  'calendar': 'Calendar',
  'check': 'Check',
  'clock': 'Clock',
  'code': 'Code',
  'edit': 'Edit',
  'email': 'Email',
  'file': 'File',
  'folder': 'Folder',
  'home': 'Home',
  'image': 'Image',
  'lock': 'Lock',
  'message': 'Message',
  'phone': 'Phone',
  'settings': 'Settings',
  'star': 'Star',
  'user': 'User',
};

export default PredefinedIconsGrid;