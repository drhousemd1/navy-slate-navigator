
import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export const useRewardIcon = (initialIconName?: string) => {
  const [selectedIconName, setSelectedIconName] = useState<string | null>(initialIconName || null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const handleSelectIcon = useCallback((iconName: string) => {
    setSelectedIconName(iconName);
    setIconPreview(null); // Clear preview when selecting predefined icon
  }, []);

  const handleUploadIcon = useCallback(() => {
    logger.debug('Custom icon upload not implemented for rewards yet');
  }, []);

  const handleRemoveIcon = useCallback(() => {
    setSelectedIconName(null);
    setIconPreview(null);
  }, []);

  return {
    selectedIconName,
    iconPreview,
    handleSelectIcon,
    handleUploadIcon,
    handleRemoveIcon,
    setSelectedIconName,
    setIconPreview
  };
};
