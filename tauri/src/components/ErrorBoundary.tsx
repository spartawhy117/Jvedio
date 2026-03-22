/**
 * ErrorBoundary — catches React rendering errors and displays a fallback UI.
 *
 * Wraps the entire app (or sub-trees) to prevent white-screen crashes.
 * Logs the error for debugging and provides a retry button.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AppIcon } from "./shared/AppIcon";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon"><AppIcon name="failed" size={28} /></div>
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-message">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          {this.state.errorInfo && (
            <details className="error-boundary-details">
              <summary>Error Details</summary>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
          <button className="error-boundary-retry" onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
