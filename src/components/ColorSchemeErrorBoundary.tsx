import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ColorSchemeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ColorScheme Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.warn('ColorScheme component failed, rendering children without color scheme context');
      return this.props.children;
    }

    return this.props.children;
  }
}