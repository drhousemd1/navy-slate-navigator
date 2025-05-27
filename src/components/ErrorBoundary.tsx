import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button'; // Using existing Button component
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    logger.error("Uncaught error:", error, errorInfo);
    // You could also log the error to an error reporting service here
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
          <h1 className="text-2xl font-semibold mb-4">
            {this.props.fallbackMessage || "Oops! Something went wrong."}
          </h1>
          <p className="mb-4 text-center">
            We've encountered an unexpected error. Please try reloading the page.
          </p>
          {this.state.error && (
            <details className="mb-4 p-2 bg-destructive/10 text-destructive rounded text-sm max-w-md overflow-auto">
              <summary>Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {this.state.error.toString()}
                {this.state.errorInfo && `\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
              </pre>
            </details>
          )}
          <Button onClick={this.handleReload} variant="outline">
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
