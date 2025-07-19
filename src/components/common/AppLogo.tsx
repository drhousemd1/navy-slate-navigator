import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { logoManager } from '@/services/logoManager';
import { LOGO_SIZES, LogoSize } from '@/config/logoConfig';
import { logger } from '@/lib/logger';

interface AppLogoProps {
  size?: LogoSize;
  className?: string;
  alt?: string;
  onClick?: () => void;
  loading?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'responsive',
  className,
  alt = 'Playful Obedience Logo',
  onClick,
  loading = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const logoUrl = imageError ? logoManager.getFallbackLogo() : logoManager.getCurrentLogo();
  const sizeStyle = LOGO_SIZES[size];

  // Set up a timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        logger.warn('Logo loading timeout, showing image anyway');
        setIsLoading(false);
      }, 3000); // 3 second timeout for PNG files
      
      setLoadingTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    } else if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [isLoading]);

  const handleImageError = () => {
    logger.warn('Logo failed to load, using fallback');
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    logger.info('Logo loaded successfully');
    setIsLoading(false);
  };

  const handleImageLoadStart = () => {
    // Show loading for all image types if explicitly requested
    if (loading) {
      setIsLoading(true);
    }
  };

  if (loading || isLoading) {
    return (
      <div 
        className={cn(
          "bg-muted animate-pulse rounded-lg flex items-center justify-center",
          className
        )}
        style={{ width: sizeStyle, height: sizeStyle }}
      >
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-center",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      style={{ width: sizeStyle, height: sizeStyle }}
    >
      <img
        src={logoUrl}
        alt={alt}
        className="w-full h-full object-contain drop-shadow-lg"
        onError={handleImageError}
        onLoad={handleImageLoad}
        onLoadStart={handleImageLoadStart}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}
      />
    </div>
  );
};

export default AppLogo;
