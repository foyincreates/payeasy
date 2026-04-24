"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

function TransactionCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="glass-card p-5"
      aria-hidden="true"
    >
      <div className="flex items-center gap-4">
        {/* Icon placeholder */}
        <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />

        {/* Type label + amount */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Date + hash (hidden on mobile) */}
        <div className="hidden sm:flex flex-col items-end gap-2 ml-4 pr-4 border-r border-white/5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Explorer link button */}
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      </div>
    </motion.div>
  );
}

const SKELETON_COUNT = 5;

export default function TransactionListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Mimic the list control header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10 bg-white/5 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
        <Skeleton className="h-11 w-full md:w-96 rounded-xl" />
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <TransactionCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
