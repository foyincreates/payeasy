"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section aria-label="Join PayEasy" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto text-center"
      >
        <div className="glass-card p-12 md:p-16 relative overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-5 text-balance">
              Ready to{" "}
              <span className="gradient-text">Share Rent Smarter?</span>
            </h2>
            <p className="text-dark-400 text-lg max-w-xl mx-auto mb-8 text-balance">
              Join the future of rent sharing. Open source, blockchain-secured, and
              built for roommates everywhere.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/connect"
                className="btn-primary !py-4 !px-10 !text-lg !rounded-xl group"
              >
                Get Started
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <a
                href="https://github.com/Ogstevyn/payeasy"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !py-4 !px-10 !text-lg !rounded-xl"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
