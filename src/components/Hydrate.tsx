
import React, { ReactNode } from 'react';
import HydrationErrorBoundary from './HydrationErrorBoundary';

interface HydrateProps {
  children: ReactNode;
  fallbackMessage?: string;
}

const Hydrate: React.FC<HydrateProps> = ({ 
  children, 
  fallbackMessage
}) => {
  // No loading state - always render children immediately
  return (
    <HydrationErrorBoundary fallbackMessage={fallbackMessage}>
      {children}
    </HydrationErrorBoundary>
  );
};

export default Hydrate;
