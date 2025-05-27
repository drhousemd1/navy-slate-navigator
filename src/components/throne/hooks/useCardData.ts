
import { useMemo } from 'react';
import { CardDisplayProps } from '@/components/throne/ThroneRoomCard'; // Assuming this path
import { getIconByName } from '@/lib/iconUtils'; // Assuming this utility
import { logger } from '@/lib/logger'; // Added logger

export const useCardData = (card: CardDisplayProps) => {
  const {
    titleColor = '#FFFFFF',
    subtextColor = '#CCCCCC',
    iconColor = '#FFFFFF',
    icon,
    iconUrl,
    backgroundImageUrl,
    backgroundOpacity = 100,
    focalPointX = 50,
    focalPointY = 50,
  } = card;

  const titleStyles = useMemo(() => {
    logger.debug("Calculated title styles:", { color: titleColor });
    return { color: titleColor };
  }, [titleColor]);

  const subtextStyles = useMemo(() => {
    logger.debug("Calculated subtext styles:", { color: subtextColor });
    return { color: subtextColor };
  }, [subtextColor]);

  const IconComponent = useMemo(() => {
    if (iconUrl) return null; // If iconUrl is present, we'll use an <img> tag
    return icon ? getIconByName(icon) : null;
  }, [icon, iconUrl]);

  const iconProps = useMemo(() => {
    logger.debug("Calculated icon props:", { style: { color: iconColor } });
    return { style: { color: iconColor }, className: 'w-6 h-6 sm:w-8 sm:h-8' };
  }, [iconColor]);
  
  const backgroundStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      opacity: backgroundOpacity / 100,
    };
    if (backgroundImageUrl) {
      styles.backgroundImage = `url(${backgroundImageUrl})`;
      styles.backgroundPosition = `${focalPointX}% ${focalPointY}%`;
      styles.backgroundSize = 'cover'; // Default, can be customized if needed
    }
    return styles;
  }, [backgroundImageUrl, backgroundOpacity, focalPointX, focalPointY]);


  return {
    titleStyles,
    subtextStyles,
    IconComponent, // This will be null if iconUrl is used
    iconProps,
    actualIconUrl: iconUrl, // Pass this to use in <img> tag if IconComponent is null
    backgroundStyles,
  };
};
