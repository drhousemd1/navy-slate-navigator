
import React, { useState, useEffect } from 'react';
import { predefinedIcons, allIconsList, IconObject } from './IconSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
}

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({ 
  selectedIconName, 
  iconColor, 
  onSelectIcon 
}) => {
  const [isPresetsDialogOpen, setIsPresetsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIcons, setFilteredIcons] = useState<IconObject[]>(predefinedIcons);

  // Filter icons based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // When search is empty, show default predefined icons
      setFilteredIcons(predefinedIcons);
    } else {
      // When searching, look through the entire icon library
      const query = searchQuery.toLowerCase();
      const filtered = allIconsList.filter(icon => 
        icon.name.toLowerCase().includes(query)
      );
      setFilteredIcons(filtered);
    }
  }, [searchQuery]);

  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName);
    setIsPresetsDialogOpen(false);
    setSearchQuery(''); // Reset search when selecting an icon
  };

  return (
    <div className="border-2 border-light-navy rounded-lg p-4 flex flex-col h-full">
      <div className="space-y-3 mb-4">
        <Button 
          type="button"
          className="w-full bg-light-navy hover:bg-navy text-white"
          onClick={() => setIsPresetsDialogOpen(true)}
        >
          Browse Presets
        </Button>
        
        <Button 
          type="button"
          className="w-full bg-light-navy hover:bg-navy text-white"
        >
          Browse Custom
        </Button>
      </div>
      
      <div className="mt-2">
        <p className="text-white text-sm font-medium mb-2">Recently Used Icons</p>
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, index) => (
            <div 
              key={index} 
              className="w-full aspect-square rounded-md bg-dark-navy flex items-center justify-center"
            />
          ))}
        </div>
      </div>

      {/* Presets Dialog */}
      <Dialog open={isPresetsDialogOpen} onOpenChange={(open) => {
        setIsPresetsDialogOpen(open);
        if (!open) setSearchQuery(''); // Reset search when closing dialog
      }}>
        <DialogContent className="bg-navy border-light-navy text-white max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Preset Icons
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mt-2 mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-dark-navy border-light-navy text-white placeholder:text-gray-400 w-full"
            />
          </div>
          
          <ScrollArea className="h-[60vh] pr-4">
            {filteredIcons.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mt-4">
                {filteredIcons.map((iconObj, index) => {
                  const { name, icon: IconComponent } = iconObj;
                  return (
                    <div 
                      key={index} 
                      className={`aspect-square rounded-md ${
                        selectedIconName === name ? 'bg-nav-active' : 'bg-light-navy'
                      } flex items-center justify-center cursor-pointer hover:bg-navy transition-colors p-2`}
                      onClick={() => handleIconSelect(name)}
                      aria-label={`Select ${name} icon`}
                      title={name}
                    >
                      <IconComponent 
                        className="h-6 w-6" 
                        style={{ color: iconColor }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Search className="h-10 w-10 mb-2 opacity-50" />
                <p>No icons found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PredefinedIconsGrid;
