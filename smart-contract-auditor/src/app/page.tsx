'use client';

import { useState, useEffect } from 'react';
import { Shield, Send, AlertCircle, CheckCircle2, Info, Cpu, Eye } from 'lucide-react';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
import LoadingSpinner from '@/components/LoadingSpinner';
import ReportPreview from '@/components/ReportPreview';
import { ContractFile, AuditState } from '@/lib/types';
import { SAMPLE_SECURITY_REPORT, SAMPLE_VULNERABILITY_REPORT } from '@/lib/sampleReports';

interface Provider {
  id: string;
  name: string;
  model: string;
  available: boolean;
}

export default function Home() {
  const [contracts, setContracts] = useState<ContractFile[]>([]);
  const [tests, setTests] = useState<ContractFile[]>([]);
  const [protocolDescription, setProtocolDescription] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isDemo, setIsDemo] = useState(false);
  const [auditState, setAuditState] = useState<AuditState>({
    isLoading: false,
    reports: null,
    error: null,
  });

  const showDemoPreview = () => {
    setIsDemo(true);
    setAuditState({
      isLoading: false,
      reports: {
        securityReport: SAMPLE_SECURITY_REPORT,
        vulnerabilityAnalysis: SAMPLE_VULNERABILITY_REPORT,
      },
      error: null,
    });
  };

  // Fetch available providers on mount
  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        // Auto-select first available provider
        const firstAvailable = data.providers.find((p: Provider) => p.available);
        if (firstAvailable) {
          setSelectedProvider(firstAvailable.id);
        }
      })
      .catch(console.error);
  }, []);

  const availableProviders = providers.filter(p => p.available);
  const canSubmit = contracts.length > 0 && selectedProvider;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setAuditState({ isLoading: true, reports: null, error: null });

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contracts,
          tests,
          protocolDescription,
          provider: selectedProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Audit failed');
      }

      setAuditState({
        isLoading: false,
        reports: {
          securityReport: data.securityReport,
          vulnerabilityAnalysis: data.vulnerabilityAnalysis,
        },
        error: null,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        reports: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleReset = () => {
    setContracts([]);
    setTests([]);
    setProtocolDescription('');
    setAuditState({ isLoading: false, reports: null, error: null });
    setIsDemo(false);
    // Reset to first available provider
    const firstAvailable = providers.find(p => p.available);
    if (firstAvailable) {
      setSelectedProvider(firstAvailable.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Loading Overlay */}
      {auditState.isLoading && <LoadingSpinner />}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Smart Contract Security Audit</h1>
                <p className="text-purple-100 mt-1">
                  AI-powered security analysis following Trail of Bits methodology
                </p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2 text-sm">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Show Results or Form */}
        {auditState.reports ? (
          <div className="space-y-6">
            {/* Success/Demo Banner */}
            <div className={`${isDemo ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-xl p-4 flex items-center gap-3`}>
              {isDemo ? (
                <Eye className="w-6 h-6 text-blue-600" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              )}
              <div>
                <h3 className={`font-semibold ${isDemo ? 'text-blue-800' : 'text-green-800'}`}>
                  {isDemo ? 'Demo Preview Mode' : 'Audit Complete!'}
                </h3>
                <p className={`text-sm ${isDemo ? 'text-blue-600' : 'text-green-600'}`}>
                  {isDemo 
                    ? 'This is a sample report to preview the styling. No API calls were made.'
                    : 'Your security reports are ready for download'
                  }
                </p>
              </div>
              <button
                onClick={handleReset}
                className={`ml-auto px-4 py-2 ${isDemo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white text-sm font-medium rounded-lg transition-colors`}
              >
                {isDemo ? 'Exit Demo' : 'Start New Audit'}
              </button>
            </div>

            {/* Reports */}
            <div className="space-y-6">
              <ReportPreview
                title="Security Audit Report"
                content={auditState.reports.securityReport}
                filename="SECURITY_AUDIT_REPORT.md"
                icon="security"
              />
              <ReportPreview
                title="Vulnerability Analysis"
                content={auditState.reports.vulnerabilityAnalysis}
                filename="VULNERABILITY_ANALYSIS.md"
                icon="vulnerability"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - File Uploads */}
            <div className="lg:col-span-2 space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-800">How it works</h3>
                  <p className="text-sm text-blue-600 mt-1">
                    Upload your Solidity contracts and optional test files. Our AI will analyze
                    them following the Trail of Bits Testing Handbook methodology and generate
                    comprehensive security reports.
                  </p>
                </div>
                <button
                  onClick={showDemoPreview}
                  className="flex-shrink-0 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  Preview Demo
                </button>
              </div>

              {/* Error Display */}
              {auditState.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800">Audit Failed</h3>
                    <p className="text-sm text-red-600 mt-1">{auditState.error}</p>
                  </div>
                </div>
              )}

              {/* Contract Upload */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <FileUpload
                  label="Smart Contracts *"
                  description="Upload the Solidity contracts you want to audit (.sol files)"
                  files={contracts}
                  onFilesChange={setContracts}
                  type="contract"
                />
              </div>

              {/* Test Upload */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <FileUpload
                  label="Test Files (Optional)"
                  description="Upload test files to help analyze coverage (.t.sol files)"
                  files={tests}
                  onFilesChange={setTests}
                  type="test"
                />
              </div>

              {/* Protocol Description */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Protocol Description (Optional)
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Describe what your protocol does to help the AI understand the context
                </p>
                <textarea
                  value={protocolDescription}
                  onChange={(e) => setProtocolDescription(e.target.value)}
                  placeholder="E.g., This is a DeFi lending protocol that allows users to deposit ETH and borrow stablecoins..."
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                />
              </div>
            </div>

            {/* Right Column - Summary & Submit */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Audit Summary</h3>

                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-purple-600">
                        {contracts.length}
                      </p>
                      <p className="text-sm text-purple-700">Contracts</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-green-600">
                        {tests.length}
                      </p>
                      <p className="text-sm text-green-700">Test Files</p>
                    </div>
                  </div>

                  {/* Total Lines */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Lines of Code</p>
                    <p className="text-xl font-bold text-gray-900">
                      {[...contracts, ...tests].reduce(
                        (acc, file) => acc + file.content.split('\n').length,
                        0
                      ).toLocaleString()}
                    </p>
                  </div>

                  {/* Checklist */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          contracts.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={contracts.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
                        At least one contract uploaded
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          tests.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={tests.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
                        Test files included
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          protocolDescription ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={protocolDescription ? 'text-gray-700' : 'text-gray-400'}>
                        Protocol description added
                      </span>
                    </div>
                  </div>

                  {/* AI Provider Selection */}
                  {providers.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Cpu className="w-4 h-4 inline mr-1" />
                        AI Provider
                      </label>
                      <div className="space-y-2">
                        {providers.filter(p => p.available).map((provider) => (
                          <label
                            key={provider.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedProvider === provider.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="provider"
                              value={provider.id}
                              checked={selectedProvider === provider.id}
                              onChange={(e) => setSelectedProvider(e.target.value)}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                              <p className="text-xs text-gray-500">{provider.model}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      {providers.filter(p => p.available).length === 0 && (
                        <p className="text-sm text-red-500">No AI providers configured. Add API keys in .env</p>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || auditState.isLoading}
                    className={`
                      w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all
                      ${
                        canSubmit && !auditState.isLoading
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                          : 'bg-gray-300 cursor-not-allowed'
                      }
                    `}
                  >
                    <Send className="w-5 h-5" />
                    {auditState.isLoading ? 'Auditing...' : 'Start Security Audit'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Audit typically takes 30-60 seconds
                  </p>
                </div>
              </div>

              {/* Methodology Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
                <h3 className="font-semibold mb-3">🔍 Audit Methodology</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Trail of Bits Guidelines
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Static Analysis Patterns
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Access Control Review
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Reentrancy Analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Asset Flow Verification
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Powered by Claude AI • Following{' '}
            <a
              href="https://appsec.guide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              Trail of Bits Testing Handbook
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
