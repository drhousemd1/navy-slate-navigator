
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CaughtError, getErrorMessage } from '@/lib/errors'; // Import error utilities

interface ErrorDisplayProps {
  title: string;
  message?: string; // Custom message overrides error.message
  error?: CaughtError | null; // Use CaughtError type
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
  // Prioritize explicit message prop, then extract from error, then default.
  const displayMessage = message || (error ? getErrorMessage(error) : "An unexpected error occurred.");

  return (
    <div className={className}>
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {displayMessage}
          {/* Optionally, show more details in dev mode or if error is AppError with context */}
          {/* process.env.NODE_ENV === 'development' && error && isAppError(error) && error.context && (
            <pre className="mt-2 text-xs text-left whitespace-pre-wrap">
              {JSON.stringify(error.context, null, 2)}
            </pre>
          )*/}
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

