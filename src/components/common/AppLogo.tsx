import React, { useState } from 'react';
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
  alt = 'App Logo',
  onClick,
  loading = false
}) => {
  // Set your uploaded image as the default logo immediately
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false to prevent flashing
  
  // Use your uploaded image as the logo
  const logoUrl = imageError ? logoManager.getFallbackLogo() : '/lovable-uploads/dcc2780c-ff8b-4d04-85f0-aef8a8ea62d8.png';

  const handleImageError = () => {
    logger.warn('Logo failed to load, using fallback');
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const sizeStyle = LOGO_SIZES[size];

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
        className="w-full h-full object-contain"
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%' 
        }}
      />
    </div>
  );
};

export default AppLogo;