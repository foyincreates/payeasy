"use client";

import {
  Search,
  Handshake,
  Wallet,
  Home,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Browse Listings",
    description:
      "Explore apartments posted by landlords or users looking for roommates. Filter by price, location, and roommate count.",
  },
  {
    number: "02",
    icon: Handshake,
    title: "Match & Agree",
    description:
      "Connect with potential roommates or landlords. Chat, review profiles, and agree on a rent split that works for everyone.",
  },
  {
    number: "03",
    icon: Wallet,
    title: "Contribute to Escrow",
    description:
      "Each roommate contributes their share to a Stellar smart contract. Funds are locked safely until all parties have paid.",
  },
  {
    number: "04",
    icon: Home,
    title: "Move In",
    description:
      "Once all contributions are complete, funds are automatically released to the landlord. Pick up your keys and move in!",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-label="How it Works Step-by-Step" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-accent-400 text-sm font-semibold uppercase tracking-widest">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-5 text-balance">
            Four Steps to{" "}
            <span className="gradient-text">Hassle-Free Rent</span>
          </h2>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto text-balance">
            No middlemen. No trust issues. Just a transparent, blockchain-backed
            process from listing to moving in.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative text-center group"
                >
                  {/* Step number */}
                  <div className="text-7xl font-black text-white/[0.03] absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 select-none pointer-events-none">
                    {step.number}
                  </div>

                  {/* Icon circle */}
                  <div className="relative z-10 w-20 h-20 rounded-2xl glass mx-auto mb-6 flex items-center justify-center transition-all group-hover:bg-brand-500/10 group-hover:border-brand-500/30">
                    <Icon
                      size={30}
                      className="text-brand-400 group-hover:text-brand-300 transition-colors"
                    />
                  </div>

                  {/* Arrow (between steps, desktop only) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-4 text-dark-600">
                      <ArrowRight size={18} />
                    </div>
                  )}

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
