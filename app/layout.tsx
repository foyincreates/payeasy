import type { Metadata } from "next";
import { StellarProvider } from "@/context/StellarContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayEasy — Blockchain-Powered Rent Sharing for Roommates",
  description:
    "Find roommates, split rent, and pay securely through Stellar blockchain escrow. PayEasy makes rent sharing transparent, trustless, and effortless.",
  keywords: [
    "rent sharing",
    "roommate finder",
    "blockchain payments",
    "stellar",
    "escrow",
    "rent splitting",
  ],
  openGraph: {
    title: "PayEasy — Blockchain-Powered Rent Sharing",
    description:
      "Find roommates, split rent, and pay securely through Stellar blockchain escrow.",
    type: "website",
    url: "https://payeasy.dev",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mesh-gradient" aria-hidden="true" />
        <StellarProvider>
          <div className="relative z-10">{children}</div>
        </StellarProvider>
      </body>
    </html>
  );
}
