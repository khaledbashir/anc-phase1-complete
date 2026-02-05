"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error: Error | null };

/**
 * Catches render errors in the proposal wizard (e.g. missing screen data).
 * Shows a fallback UI instead of crashing the whole app.
 */
export class ProposalFormErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ProposalForm] Render error:", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-6 max-w-md">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A field may be missing or invalid. Check the console for details.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-card/80 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
