"use client";

import {
  Zap,
  Globe,
  Lock,
  Code2,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

const benefits = [
  {
    icon: Zap,
    title: "Near-Zero Fees",
    description: "Transaction costs of ~$0.00001 mean more rent money goes where it should.",
  },
  {
    icon: Globe,
    title: "Global & Borderless",
    description: "Pay rent from anywhere in the world. No banks, no borders, no delays.",
  },
  {
    icon: Lock,
    title: "Smart Contract Security",
    description: "Soroban smart contracts handle escrow logic — immutable, auditable, trustless.",
  },
  {
    icon: Code2,
    title: "Open Source",
    description: "Every line of PayEasy is open source. Audit the code, contribute, and build trust.",
  },
];

export default function Stellar() {
  return (
    <section id="stellar" aria-label="Stellar Blockchain Integration" className="py-24 px-6 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-900/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent-400 text-sm font-semibold uppercase tracking-widest">
              Why Stellar?
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-6 text-balance">
              Built on the{" "}
              <span className="gradient-text">Stellar Network</span>
            </h2>
            <p className="text-dark-400 text-lg leading-relaxed mb-8">
              Stellar is a decentralized blockchain designed for fast, low-cost
              financial transactions. PayEasy uses{" "}
              <span className="text-white font-medium">Soroban</span> smart
              contracts to hold rent contributions in escrow — ensuring no one
              can withdraw until all roommates have paid.
            </p>

            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary !inline-flex"
            >
              Learn About Stellar
              <ExternalLink size={16} />
            </a>
          </motion.div>

          {/* Right — Benefit Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="glass-card p-6 group"
                >
                  <Icon
                    size={24}
                    className="text-brand-400 mb-4 transition-transform group-hover:scale-110"
                  />
                  <h3 className="text-base font-semibold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Escrow Flow Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 glass-card p-8 md:p-12"
        >
          <h3 className="text-xl font-bold text-white text-center mb-10">
            Escrow Flow
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            {[
              { label: "Roommate A", sub: "Contributes $500" },
              { label: "Roommate B", sub: "Contributes $500" },
              { label: "Roommate C", sub: "Contributes $500" },
            ].map((person, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-brand-300 font-bold text-lg">
                      {person.label.split(" ")[1]}
                    </span>
                  </div>
                  <div className="text-sm text-white font-medium">
                    {person.label}
                  </div>
                  <div className="text-xs text-dark-500">{person.sub}</div>
                </div>
                {i < 2 && (
                  <div className="hidden md:block text-dark-600 text-xs">→</div>
                )}
              </div>
            ))}

            {/* Arrow to escrow */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-16 h-px bg-gradient-to-r from-brand-500/50 to-accent-500/50" />
              <div className="text-accent-400 text-lg">→</div>
            </div>
            <div className="md:hidden text-dark-500 text-2xl my-2">↓</div>

            {/* Escrow */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 border border-accent-500/40 flex items-center justify-center mb-2 mx-auto animate-glow">
                <Lock size={28} className="text-accent-400" />
              </div>
              <div className="text-sm text-white font-semibold">
                Stellar Escrow
              </div>
              <div className="text-xs text-accent-400 font-medium">$1,500</div>
            </div>

            {/* Arrow to landlord */}
            <div className="hidden md:flex items-center gap-2">
              <div className="text-accent-400 text-lg">→</div>
              <div className="w-16 h-px bg-gradient-to-r from-accent-500/50 to-green-500/50" />
            </div>
            <div className="md:hidden text-dark-500 text-2xl my-2">↓</div>

            {/* Landlord */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 flex items-center justify-center mb-2 mx-auto">
                <span className="text-green-300 text-lg">🏠</span>
              </div>
              <div className="text-sm text-white font-medium">Landlord</div>
              <div className="text-xs text-green-400">Receives $1,500</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
