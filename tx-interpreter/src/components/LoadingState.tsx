// ============================================================================
// Component: LoadingState — Animated loading skeleton during decode
// ============================================================================

"use client";

import { motion } from "framer-motion";

export default function LoadingState() {
  const steps = [
    { label: "Fetching transaction data", icon: "🔍" },
    { label: "Decoding contract calls", icon: "📦" },
    { label: "Fetching contract ABIs", icon: "📋" },
    { label: "Running AI analysis", icon: "🤖" },
    { label: "Building interpretation", icon: "🧠" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto py-16">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        {/* Animated spinner */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-violet-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 border-l-violet-400"
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">
              🔬
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-400 text-lg">
          Decoding your transaction...
        </p>

        {/* Step indicators */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.5, duration: 0.3 }}
              className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  delay: i * 0.5 + 0.3,
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: steps.length * 0.5,
                }}
                className="text-lg"
              >
                {step.icon}
              </motion.span>
              <span className="text-sm text-zinc-300">{step.label}</span>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: i * 0.5, duration: 2 }}
                className="h-0.5 flex-1 bg-gradient-to-r from-blue-500/30 to-transparent rounded"
              />
            </motion.div>
          ))}
        </div>

        {/* Skeleton cards */}
        <div className="space-y-4 mt-8">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="h-24 rounded-2xl bg-zinc-900/50 border border-zinc-800/30"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
