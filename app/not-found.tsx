import Link from "next/link";
import { Wallet } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Floating "404" */}
      <div
        className="animate-float select-none mb-8"
        aria-hidden="true"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <span
          className="text-[10rem] font-bold leading-none gradient-text"
          style={{ letterSpacing: "-0.04em" }}
        >
          404
        </span>
      </div>

      <h1
        className="text-2xl font-bold text-white mb-3"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Page not found
      </h1>
      <p className="text-dark-500 max-w-sm text-sm leading-relaxed mb-10">
        This page doesn&apos;t exist or the escrow was not found.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link href="/" className="btn-primary !py-2.5 !px-6 !text-sm !rounded-xl">
          Go Home
        </Link>
        <Link
          href="/#connect"
          className="btn-secondary !py-2.5 !px-6 !text-sm !rounded-xl flex items-center gap-2"
        >
          <Wallet size={15} />
          Try Connecting Wallet
        </Link>
      </div>
    </main>
  );
}
