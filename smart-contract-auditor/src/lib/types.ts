// Types for the Smart Contract Auditor

export interface ContractFile {
  name: string;
  content: string;
  type: 'contract' | 'test';
}

export interface AuditRequest {
  contracts: ContractFile[];
  tests: ContractFile[];
  protocolDescription: string;
  provider?: string;
}

export interface AuditResponse {
  securityReport: string;
  vulnerabilityAnalysis: string;
  success: boolean;
  error?: string;
}

export interface AuditState {
  isLoading: boolean;
  reports: {
    securityReport: string;
    vulnerabilityAnalysis: string;
  } | null;
  error: string | null;
}
