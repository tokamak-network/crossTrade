'use client';

import { Loader2, Shield } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Analyzing contracts...' }: LoadingSpinnerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-6">
          {/* Animated Shield */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          </div>

          {/* Progress Text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Security Audit in Progress
            </h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>

          {/* Progress Steps */}
          <div className="w-full space-y-3">
            <ProgressStep label="Reading contracts" status="complete" />
            <ProgressStep label="Analyzing security patterns" status="active" />
            <ProgressStep label="Checking vulnerabilities" status="pending" />
            <ProgressStep label="Generating reports" status="pending" />
          </div>

          {/* Estimated Time */}
          <p className="text-xs text-gray-500">
            This may take 30-60 seconds depending on contract complexity
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressStep({
  label,
  status,
}: {
  label: string;
  status: 'complete' | 'active' | 'pending';
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
        ${status === 'complete' ? 'bg-green-500 text-white' : ''}
        ${status === 'active' ? 'bg-purple-500 text-white animate-pulse' : ''}
        ${status === 'pending' ? 'bg-gray-200 text-gray-500' : ''}
      `}
      >
        {status === 'complete' ? '✓' : status === 'active' ? '•' : '○'}
      </div>
      <span
        className={`text-sm ${
          status === 'pending' ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
