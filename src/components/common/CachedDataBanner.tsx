
import React from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from "@/lib/utils"; // Standard import for cn

interface CachedDataBannerProps {
  message?: string;
  className?: string;
}

const CachedDataBanner: React.FC<CachedDataBannerProps> = ({
  message = "Showing cached data due to an error during sync. Some information might be outdated.",
  className = "mb-4",
}) => {
  return (
    <Alert className={cn("border-amber-500/50 text-amber-700 dark:border-amber-500/70 dark:text-amber-400 bg-amber-500/10", className)}>
      <WifiOff className="h-5 w-5 text-amber-500" />
      <AlertTitle>Offline Data</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default CachedDataBanner;
