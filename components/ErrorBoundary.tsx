"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-[rgb(var(--bg-card))] rounded-lg border border-red-500/30 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <FaExclamationTriangle className="text-red-500" size={24} />
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                  Something went wrong
                </h2>
              </div>
              <p className="text-[rgb(var(--text-secondary))] mb-4">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-[rgb(var(--text-muted))] mb-2">
                    Error details (development only)
                  </summary>
                  <pre className="bg-[rgb(var(--bg-card-alt))] p-3 rounded text-xs overflow-auto text-red-400">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors"
                >
                  Try again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] transition-colors"
                >
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

