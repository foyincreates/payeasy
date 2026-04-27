"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { writeTextToClipboard } from "./copy-button.helpers";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  iconSize?: number;
}

export default function CopyButton({
  value,
  label = "Copy to clipboard",
  className = "",
  iconSize = 16,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy(): Promise<void> {
    await writeTextToClipboard(value);
    setCopied(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void handleCopy();
      }}
      aria-label={label}
      title={copied ? "Copied!" : label}
      className={`relative p-1.5 rounded-lg text-dark-500 hover:text-brand-400 hover:bg-white/5 transition-all outline-none flex items-center justify-center ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={iconSize} className="text-accent-400" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -45 }}
            transition={{ duration: 0.15 }}
          >
            <Copy size={iconSize} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {copied && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          role="status"
          className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-accent-400/30 bg-dark-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-accent-300 shadow-xl"
        >
          Copied!
        </motion.span>
      )}
    </button>
  );
}