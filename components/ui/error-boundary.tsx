"use client";

import React from "react";
import { PayEasyLogo } from "@/components/ui/payeasy-logo";
import { RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="flex justify-center">
            <PayEasyLogo size={48} />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Something went wrong
            </h1>
            <p className="text-dark-400 text-base leading-relaxed">
              An unexpected error occurred. Your funds and contract data are
              safe — this is a display issue only.
            </p>
            {this.state.message && (
              <p className="text-xs text-dark-600 font-mono bg-white/5 border border-white/10 rounded-xl px-4 py-2 break-all">
                {this.state.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={this.handleReload}
            className="btn-primary !py-3 !px-8 !rounded-xl font-black uppercase tracking-widest inline-flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
