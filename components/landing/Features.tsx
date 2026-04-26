"use client";

import {
  Users,
  ShieldCheck,
  CreditCard,
  Search,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "Find Roommates",
    description:
      "Browse verified apartment listings and connect with compatible roommates looking to share rent.",
    color: "from-brand-500 to-brand-700",
  },
  {
    icon: ShieldCheck,
    title: "Trustless Escrow",
    description:
      "Rent contributions are held in a Stellar smart contract. Funds are released only when all roommates pay.",
    color: "from-accent-500 to-accent-700",
  },
  {
    icon: CreditCard,
    title: "Instant Payments",
    description:
      "Settle rent in ~5 seconds with near-zero fees using Stellar blockchain. Support for XLM and stablecoins.",
    color: "from-brand-400 to-accent-500",
  },
  {
    icon: Users,
    title: "Roommate Profiles",
    description:
      "View detailed profiles, preferences, and rating history before committing to share a space.",
    color: "from-purple-500 to-brand-500",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description:
      "Chat directly with potential roommates and landlords. Coordinate moves and settle details privately.",
    color: "from-accent-400 to-teal-500",
  },
  {
    icon: BarChart3,
    title: "Payment History",
    description:
      "Full on-chain transparency. Track every contribution, payout, and escrow status in real time.",
    color: "from-brand-600 to-purple-600",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Features() {
  return (
    <section id="features" aria-label="Key Features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent-400 text-sm font-semibold uppercase tracking-widest">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-5 text-balance">
            Everything You Need to{" "}
            <span className="gradient-text">Share Rent</span>
          </h2>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto text-balance">
            From finding the perfect roommate to settling rent on the blockchain
            — PayEasy handles the entire flow.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="glass-card p-8 group"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}
                >
                  <Icon size={22} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-dark-400 leading-relaxed text-[15px]">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
