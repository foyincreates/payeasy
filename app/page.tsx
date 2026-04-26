"use client";

import { useRouter } from "next/navigation";
import { PayEasyHero } from "@/components/ui/payeasy-hero";
import { PayEasyLogo } from "@/components/ui/payeasy-logo";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Stellar from "@/components/landing/Stellar";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const router = useRouter();

  return (
    <main id="main-content" aria-label="Landing Page">
      <PayEasyHero
        logo={<PayEasyLogo size={34} />}
        navigation={[
          { label: "Features", href: "#features" },
          { label: "How It Works", href: "#how-it-works" },
          { label: "Stellar", href: "#stellar" },
        ]}
        ctaButton={{
          label: "Connect Wallet",
          onClick: () => router.push("/connect"),
        }}
        title="Split Rent. Trust the Chain."
        subtitle="Find roommates, split rent, and pay securely through Stellar blockchain escrow. Transparent, trustless, and effortless."
        primaryAction={{
          label: "Get Started",
          onClick: () => router.push("/connect"),
        }}
        secondaryAction={{
          label: "View on GitHub",
          onClick: () => {
            window.open("https://github.com/Ogstevyn/payeasy", "_blank");
          },
        }}
        disclaimer="Powered by Stellar Blockchain"
        socialProof={{
          avatars: [
            "https://i.pravatar.cc/150?img=11",
            "https://i.pravatar.cc/150?img=12",
            "https://i.pravatar.cc/150?img=13",
            "https://i.pravatar.cc/150?img=14",
          ],
          text: "Trusted by roommates worldwide",
        }}
        stats={[
          { value: "~$0.00001", label: "Transaction Fee" },
          { value: "~5 sec", label: "Settlement Time" },
          { value: "100%", label: "On-Chain Transparency" },
        ]}
        programs={[
          {
            image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=500&fit=crop",
            category: "FIND ROOMMATES",
            title: "Browse verified listings & profiles",
          },
          {
            image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=500&fit=crop",
            category: "SMART ESCROW",
            title: "Trustless rent collection on-chain",
          },
          {
            image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=500&fit=crop",
            category: "INSTANT PAYMENTS",
            title: "Settle in seconds, not days",
          },
          {
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=500&fit=crop",
            category: "MOVE IN",
            title: "Secure your new home with confidence",
          },
          {
            image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=500&fit=crop",
            category: "COMMUNITY",
            title: "Connect with trusted roommates",
          },
        ]}
      />

      <div id="features" />
      <Features />
      <div className="section-divider" />
      <div id="how-it-works" />
      <HowItWorks />
      <div className="section-divider" />
      <div id="stellar" />
      <Stellar />
      <div className="section-divider" />
      <div id="cta" />
      <CTA />
      <Footer />
    </main>
  );
}
