
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class HydrationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Hydration Error Boundary Caught:", error, errorInfo);
    // You could log this to an error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error ? getErrorMessage(this.state.error) : 'An unknown error occurred';
      
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
          <h1 className="text-2xl font-bold text-destructive mb-4">Application Error</h1>
          <p className="text-center mb-2">
            {this.props.fallbackMessage || "There was an error trying to load the application. Please try clearing your browser's cache and cookies for this site, or contact support if the problem persists."}
          </p>
          {this.state.error && (
            <details className="mt-2 text-sm text-muted-foreground">
              <summary>Error Details</summary>
              <pre className="mt-1 text-xs bg-muted p-2 rounded-md overflow-auto max-w-full">
                {errorMessage}
                {this.state.error.stack && `\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              // Attempt to clear local storage relevant to the app and reload
              // Be cautious with clearing all of localStorage if other apps use it on the same domain
              // For now, just reload. More sophisticated recovery could be added.
              window.location.reload();
            }}
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HydrationErrorBoundary;
