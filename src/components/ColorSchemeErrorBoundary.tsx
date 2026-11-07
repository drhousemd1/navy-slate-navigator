import React, { Component, ReactNode } from 'react';
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
        <main role="alert" style={{ minHeight: '100vh', background: '#151e2d', color: '#ffffff', padding: '2rem' }}>
          <h1 className="text-xl font-bold mb-2">The app could not be displayed</h1>
          <p className="mb-4">Reload to try again.</p>
          <button type="button" className="rounded border px-4 py-2" onClick={() => window.location.reload()}>Reload app</button>
        </main>
      );
    }
    return this.props.children;
  }
}
