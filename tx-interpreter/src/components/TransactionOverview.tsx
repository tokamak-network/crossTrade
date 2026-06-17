// ============================================================================
// Component: TransactionOverview — Shows basic tx info (both modes)
// ============================================================================

"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Fuel,
  Hash,
  ArrowRight,
  Blocks,
  ExternalLink,
} from "lucide-react";
import { TransactionBasic, ViewMode } from "@/lib/types";
import { shortenAddress, formatEth, formatTimestamp, formatGas } from "@/lib/utils";
import { SUPPORTED_CHAINS } from "@/lib/constants";

interface TransactionOverviewProps {
  tx: TransactionBasic;
  chainId: string;
  viewMode: ViewMode;
}

export default function TransactionOverview({
  tx,
  chainId,
  viewMode,
}: TransactionOverviewProps) {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const explorerUrl = chain?.explorerUrl || "https://etherscan.io";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {tx.status === "success" ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-semibold text-lg">Success</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-6 h-6" />
              <span className="font-semibold text-lg">Reverted</span>
            </div>
          )}
        </div>
        <a
          href={`${explorerUrl}/tx/${tx.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          View on Explorer
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction Hash */}
        <InfoCard
          icon={<Hash className="w-4 h-4" />}
          label="Transaction Hash"
          value={viewMode === "user" ? shortenAddress(tx.hash, 10) : tx.hash}
          mono
          copyable={tx.hash}
        />

        {/* From → To */}
        <InfoCard
          icon={<ArrowRight className="w-4 h-4" />}
          label="From → To"
          value={
            <span className="flex items-center gap-1 flex-wrap">
              <a
                href={`${explorerUrl}/address/${tx.from}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-mono text-sm"
              >
                {shortenAddress(tx.from)}
              </a>
              <ArrowRight className="w-3 h-3 text-zinc-500" />
              <a
                href={`${explorerUrl}/address/${tx.to || ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 font-mono text-sm"
              >
                {tx.to ? shortenAddress(tx.to) : "Contract Creation"}
              </a>
            </span>
          }
        />

        {/* Value */}
        <InfoCard
          icon={<span className="text-sm">{chain?.icon}</span>}
          label="Value"
          value={`${formatEth(tx.value)} ${chain?.nativeCurrency || "ETH"}`}
        />

        {/* Gas */}
        <InfoCard
          icon={<Fuel className="w-4 h-4" />}
          label={viewMode === "user" ? "Transaction Fee" : "Gas Used"}
          value={
            viewMode === "user"
              ? `${formatEth(tx.gasCostEth)} ${chain?.nativeCurrency || "ETH"}`
              : `${formatGas(tx.gasUsed)} units (${formatEth(tx.gasCostEth)} ${chain?.nativeCurrency || "ETH"})`
          }
        />

        {/* Block */}
        <InfoCard
          icon={<Blocks className="w-4 h-4" />}
          label="Block"
          value={tx.blockNumber.toLocaleString()}
        />

        {/* Timestamp */}
        <InfoCard
          icon={<Clock className="w-4 h-4" />}
          label="Time"
          value={formatTimestamp(tx.timestamp)}
        />

        {/* Dev-only fields */}
        {viewMode === "dev" && (
          <>
            <InfoCard
              icon={<span className="text-xs font-bold">#</span>}
              label="Nonce"
              value={tx.nonce.toString()}
            />
            <InfoCard
              icon={<span className="text-xs font-bold">fn</span>}
              label="Method ID"
              value={tx.methodId || "0x (Transfer)"}
              mono
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

// ---------- Sub-component ----------

function InfoCard({
  icon,
  label,
  value,
  mono,
  copyable,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: string;
}) {
  const handleCopy = () => {
    if (copyable) navigator.clipboard.writeText(copyable);
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800/80 transition-colors group cursor-default"
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? "Click to copy" : undefined}
    >
      <div className="mt-0.5 text-zinc-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
        <div
          className={`text-sm text-white break-all ${mono ? "font-mono" : ""}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
