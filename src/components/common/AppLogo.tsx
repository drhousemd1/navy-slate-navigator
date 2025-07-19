
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
  alt = 'App Logo',
  onClick,
  loading = false
}) => {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const url = await logoManager.getCurrentLogo();
        setLogoUrl(url);
      } catch (error) {
        logger.error('Failed to load logo', { error });
        setLogoUrl(logoManager.getFallbackLogo());
      } finally {
        setIsLoading(false);
      }
    };

    loadLogo();
  }, []);

  const handleImageError = () => {
    logger.warn('Logo failed to load, using fallback');
    setImageError(true);
    setLogoUrl(logoManager.getFallbackLogo());
  };

  const handleImageLoad = () => {
    setImageError(false);
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
