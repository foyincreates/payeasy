import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <main aria-label="Terms of Service" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#07070a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(92,124,250,0.1),transparent_50%)] pointer-events-none" />
      
      <div className="container relative z-10 mx-auto px-6 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-brand-300 transition-all group mb-12 uppercase tracking-widest text-[10px] font-black"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>

        <header className="mb-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-8">
            <FileText size={32} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
            Terms of <span className="text-brand-400">Service</span>
          </h1>
          <p className="text-dark-500 text-xl font-medium max-w-2xl leading-relaxed">
            Please read these terms carefully before using the PayEasy decentralized platform.
          </p>
        </header>

        <div className="glass-card p-8 md:p-12 space-y-10 text-dark-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">1. Acceptance of Terms</h2>
            <p>
              By accessing PayEasy, you agree to be bound by these Terms. 
              PayEasy is an interface for interacting with smart contracts on the Stellar blockchain.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">2. Use of Smart Contracts</h2>
            <p>
              Smart contracts are autonomous programs. Once deployed and executed, they cannot be reversed. 
              You are responsible for ensuring the accuracy of all inputs, including wallet addresses and amounts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">3. Limitation of Liability</h2>
            <p>
              PayEasy is provided "as is" without warranties of any kind. 
              We are not responsible for any loss of funds due to smart contract bugs, network failures, 
              or user error.
            </p>
          </section>

          <div className="pt-8 border-t border-white/5 text-dark-500 text-sm italic">
            Last updated: April 26, 2026
          </div>
        </div>
      </div>
    </main>
  );
}
