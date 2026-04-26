"use client";

import OfflineBanner from "./offline-banner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
