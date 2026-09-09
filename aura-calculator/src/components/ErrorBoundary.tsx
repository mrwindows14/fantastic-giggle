"use client";

import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)]">
            <AlertTriangle className="h-8 w-8 text-[var(--paper)]" />
          </div>
          <h3 className="mb-2 font-[var(--font-display)] text-2xl font-black uppercase text-[var(--ink)]">
            Something went wrong
          </h3>
          <p className="mb-6 max-w-md text-sm text-[var(--ink-muted)]">
            A rendering error occurred. This is usually caused by a WebGL
            compatibility issue with the 3D scene.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="sketch-btn"
          >
            <RefreshCcw className="h-4 w-4" />
            RELOAD PAGE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
