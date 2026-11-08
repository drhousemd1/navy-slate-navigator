import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { applyColorScheme, getColorScheme } from '@/lib/colorSchemes';

export class ColorSchemeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // The fallback has independent colors even if applying CSS itself failed.
    try { applyColorScheme(getColorScheme('default')!); } catch { /* Keep the independent fallback. */ }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4" style={{ background: 'hsl(222.2 84% 4.9%)', color: 'hsl(210 40% 98%)' }}>
          <h1 className="text-2xl font-semibold mb-4">The app could not be displayed</h1>
          <p className="mb-4 text-center">Reload to try again.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Reload app</Button>
        </main>
      );
    }
    return this.props.children;
  }
}
