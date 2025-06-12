
import React, { useState, useCallback } from 'react';
import { parseImageMeta, getBestImageUrl, isLegacyImageUrl, type ImageMeta } from '@/utils/image/helpers';
import { logger } from '@/lib/logger';

interface OptimizedImageProps {
  imageMeta?: any; // JSONB data from database
  imageUrl?: string; // Legacy image URL fallback
  alt: string;
  className?: string;
  preferThumbnail?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  imageMeta,
  imageUrl,
  alt,
  className = '',
  preferThumbnail = false,
  style,
  onClick,
  onLoad,
  onError
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Parse image metadata
  const parsedMeta: ImageMeta | null = parseImageMeta(imageMeta);
  
  // Determine the best image URL to use
  const getImageSrc = useCallback((): string => {
    // Priority 1: Use optimized image metadata
    if (parsedMeta) {
      return getBestImageUrl(parsedMeta, preferThumbnail);
    }
    
    // Priority 2: Fall back to legacy image URL
    if (imageUrl && !hasError) {
      return imageUrl;
    }
    
    return '';
  }, [parsedMeta, imageUrl, preferThumbnail, hasError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    logger.debug('[OptimizedImage] Image failed to load:', getImageSrc());
    onError?.();
  }, [getImageSrc, onError]);

  const imageSrc = getImageSrc();

  // Don't render anything if no image source is available
  if (!imageSrc) {
    return null;
  }

  // Show compression info for optimized images in development
  const showCompressionInfo = parsedMeta && process.env.NODE_ENV === 'development';

  return (
    <div className="relative">
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity duration-200`}
        style={style}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-80 rounded text-white text-xs">
          Image failed to load
        </div>
      )}
      
      {/* Development compression info */}
      {showCompressionInfo && (
        <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
          -{parsedMeta.compressionRatio}%
        </div>
      )}
      
      {/* Legacy image indicator */}
      {imageUrl && isLegacyImageUrl(imageUrl) && process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-1 left-1 bg-yellow-600 bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
          Legacy
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
