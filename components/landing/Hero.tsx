"use client";

import { ArrowRight, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section aria-label="Hero Section" className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-6 overflow-hidden">
      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/8 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "3s" }}
      />

      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8"
        >
          <Sparkles size={14} className="text-accent-400" />
          <span className="text-sm text-dark-300">
            Powered by Stellar Blockchain
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight mb-6 text-balance"
        >
          Split Rent.
          <br />
          <span className="gradient-text">Trust the Chain.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-lg md:text-xl text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed text-balance"
        >
          Find perfect roommates, contribute rent to a trustless escrow, and
          move in when everyone&apos;s paid. Secured by Stellar, designed for
          humans.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a href="#" className="btn-primary !py-4 !px-8 !text-lg !rounded-xl group">
            Find Roommates
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>
          <a href="#" className="btn-secondary !py-4 !px-8 !text-lg !rounded-xl">
            <Shield size={18} />
            How Escrow Works
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="glass rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x divide-white/10">
            {[
              { value: "~$0.00001", label: "Transaction Fee" },
              { value: "~5 sec", label: "Settlement Time" },
              { value: "100%", label: "Transparent & On-Chain" },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <div className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-dark-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
