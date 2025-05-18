
import React, { ReactNode } from 'react';
import { useIsRestoring } from '@tanstack/react-query'; // Changed import source
import HydrationErrorBoundary from './HydrationErrorBoundary';
import { LoaderCircle } from 'lucide-react';

interface HydrateProps {
  children: ReactNode;
  loadingMessage?: string;
  fallbackMessage?: string;
}

const Hydrate: React.FC<HydrateProps> = ({ 
  children, 
  loadingMessage = "Restoring your session, please wait...",
  fallbackMessage
}) => {
  const isRestoring = useIsRestoring();

  if (isRestoring) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <LoaderCircle className="animate-spin h-12 w-12 mb-4 text-primary" />
        <p className="text-lg">{loadingMessage}</p>
      </div>
    );
  }

  return (
    <HydrationErrorBoundary fallbackMessage={fallbackMessage}>
      {children}
    </HydrationErrorBoundary>
  );
};

export default Hydrate;
