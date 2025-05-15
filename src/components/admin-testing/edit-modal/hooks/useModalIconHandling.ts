
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export const useModalIconHandling = (initialIconUrl?: string, initialIconName?: string) => {
  const [iconPreview, setIconPreview] = useState<string | null>(initialIconUrl || null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(initialIconName || null);

  const handleIconUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.files) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setIconPreview(base64String);
            setSelectedIconName(null);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleIconSelect = (iconName: string) => {
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setIconPreview(iconUrl);
      setSelectedIconName(null);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the card",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };

  const handleRemoveIcon = () => {
    setIconPreview(null);
    setSelectedIconName(null);
  };

  return {
    iconPreview,
    selectedIconName,
    handleIconUpload,
    handleIconSelect,
    handleRemoveIcon
  };
};
