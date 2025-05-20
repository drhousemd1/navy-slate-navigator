
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  title: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryButtonText?: string;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  error,
  onRetry,
  retryButtonText = "Try Again",
  className = "text-center py-10 mt-4",
}) => {
  const displayMessage = message || error?.message || "An unexpected error occurred.";

  return (
    <div className={className}>
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {displayMessage}
          {onRetry && (
            <Button onClick={onRetry} variant="destructive" size="sm" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryButtonText}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ErrorDisplay;
