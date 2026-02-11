// ============================================================================
// Component: UserModeView — Simple, visual explanation for non-technical users
// ============================================================================

"use client";

import { motion } from "framer-motion";
import {
  ArrowDownUp,
  AlertTriangle,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { UserModeInterpretation, BalanceChange } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UserModeViewProps {
  interpretation: UserModeInterpretation;
  balanceChanges: BalanceChange[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function UserModeView({
  interpretation,
  balanceChanges,
}: UserModeViewProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Summary Card */}
      <motion.div
        variants={item}
        className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <ArrowDownUp className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {interpretation.summary}
            </h3>
            <p className="text-zinc-300 leading-relaxed">
              {interpretation.whatHappened}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Steps Timeline */}
      {interpretation.steps.length > 0 && (
        <motion.div
          variants={item}
          className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            📍 What Happened Step by Step
          </h3>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-700" />

            <div className="space-y-6">
              {interpretation.steps.map((step, index) => (
                <motion.div
                  key={step.stepNumber}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="relative flex items-start gap-4 pl-2"
                >
                  {/* Step icon */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center flex-shrink-0 text-lg">
                    {step.icon}
                  </div>
                  <div className="pt-1">
                    <h4 className="text-white font-medium">{step.title}</h4>
                    <p className="text-zinc-400 text-sm mt-1">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Final checkmark */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + interpretation.steps.length * 0.1 }}
                className="relative flex items-start gap-4 pl-2"
              >
                <div className="relative z-10 w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="pt-2">
                  <h4 className="text-emerald-400 font-medium">
                    {interpretation.status}
                  </h4>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Balance Changes */}
      <motion.div
        variants={item}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-zinc-400" />
          Your Balance Changes
        </h3>

        {balanceChanges.length > 0 ? (
          <div className="space-y-3">
            {balanceChanges.map((change, i) => {
              const isPositive = change.change.startsWith("+");
              const isNegative = change.change.startsWith("-");

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl",
                    isPositive && "bg-emerald-500/10 border border-emerald-500/20",
                    isNegative && "bg-red-500/10 border border-red-500/20",
                    !isPositive && !isNegative && "bg-zinc-800/50 border border-zinc-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {isPositive ? "📥" : isNegative ? "📤" : "🔄"}
                    </span>
                    <div>
                      <p className="text-white font-medium">
                        {change.tokenSymbol}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {change.isNative ? "Native currency" : "Token"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-lg font-semibold font-mono",
                      isPositive && "text-emerald-400",
                      isNegative && "text-red-400",
                      !isPositive && !isNegative && "text-zinc-300"
                    )}
                  >
                    {change.change}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">
            {interpretation.balanceSummary}
          </p>
        )}
      </motion.div>

      {/* Warnings */}
      {interpretation.warnings.length > 0 && (
        <motion.div
          variants={item}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Things to Note
          </h3>
          <ul className="space-y-2">
            {interpretation.warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span className="text-zinc-300 text-sm">{warning}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
