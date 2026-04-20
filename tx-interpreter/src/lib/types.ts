// ============================================================================
// Transaction Interpreter — Core Types
// ============================================================================

export type ViewMode = "user" | "dev";

export type Chain = {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  icon: string;
};

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  tier: "free" | "standard" | "premium";
  description: string;
};

// ---------- Transaction Data ----------

export interface TransactionBasic {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string;
  gasPrice: string;
  gasCostEth: string;
  gasCostUsd: string | null;
  blockNumber: number;
  timestamp: number;
  status: "success" | "reverted";
  nonce: number;
  input: string;
  methodId: string;
}

export interface DecodedParam {
  name: string;
  type: string;
  value: string;
}

export interface EventLog {
  address: string;
  name: string;
  signature: string;
  params: DecodedParam[];
  topic0: string;
}

export interface InternalCall {
  from: string;
  to: string;
  type: "CALL" | "STATICCALL" | "DELEGATECALL" | "CREATE" | "CREATE2" | "SELFDESTRUCT";
  value: string;
  gasUsed: string;
  input: string;
  output: string;
  methodName: string | null;
  methodSignature: string | null;
  decodedInput: DecodedParam[];
  decodedOutput: DecodedParam[];
  depth: number;
  children: InternalCall[];
  error: string | null;
}

export interface BalanceChange {
  address: string;
  token: string;
  tokenSymbol: string;
  tokenDecimals: number;
  before: string;
  after: string;
  change: string;
  isNative: boolean;
}

export interface ContractInfo {
  address: string;
  name: string | null;
  verified: boolean;
  abi: string | null;
}

export interface TransactionTrace {
  basic: TransactionBasic;
  events: EventLog[];
  internalCalls: InternalCall[];
  balanceChanges: BalanceChange[];
  contracts: ContractInfo[];
}

// ---------- AI Interpretation ----------

export interface UserModeStep {
  stepNumber: number;
  title: string;
  description: string;
  icon: string;
}

export interface UserModeInterpretation {
  summary: string;
  whatHappened: string;
  steps: UserModeStep[];
  balanceSummary: string;
  status: string;
  warnings: string[];
}

export interface DevModeInterpretation {
  summary: string;
  technicalOverview: string;
  callFlowExplanation: string;
  gasAnalysis: string;
  securityNotes: string[];
  functionExplanations: {
    contract: string;
    functionName: string;
    explanation: string;
    params: string;
    gasUsed: string;
  }[];
  stateChanges: string;
  eventAnalysis: string;
}

export interface InterpretationResult {
  userMode: UserModeInterpretation;
  devMode: DevModeInterpretation;
}

// ---------- API ----------

export interface DecodeRequest {
  txHash: string;
  chainId: string;
  aiModel: string;
}

export interface DecodeResponse {
  success: boolean;
  trace: TransactionTrace | null;
  interpretation: InterpretationResult | null;
  error: string | null;
}
