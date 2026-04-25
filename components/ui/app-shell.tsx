"use client";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { StellarProvider } from "@/context/StellarContext";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SkipLink } from "@/components/ui/skip-link";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <DottedSurface />
      <div className="mesh-gradient" aria-hidden="true" />
      <SkipLink />
      <StellarProvider>
        <ToastProvider>
          <ErrorBoundary>
            <div className="relative z-10">{children}</div>
          </ErrorBoundary>
        </ToastProvider>
      </StellarProvider>
    </ThemeProvider>
  );
}
