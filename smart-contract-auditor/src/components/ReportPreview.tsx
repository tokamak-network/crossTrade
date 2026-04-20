'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Eye, Code, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface ReportPreviewProps {
  title: string;
  content: string;
  filename: string;
  icon: 'security' | 'vulnerability';
}

export default function ReportPreview({
  title,
  content,
  filename,
  icon,
}: ReportPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={`
        px-6 py-4 flex items-center justify-between cursor-pointer
        ${icon === 'security' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-red-500'}
      `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-white" />
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/80">{filename}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div>
          {/* Toolbar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('preview')}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors
                  ${viewMode === 'preview' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-100'}
                `}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors
                  ${viewMode === 'raw' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-100'}
                `}
              >
                <Code className="w-4 h-4" />
                Raw
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {/* Report Content */}
          <div className="p-6 max-h-[600px] overflow-y-auto bg-gray-50">
            {viewMode === 'preview' ? (
              <div className="prose prose-sm max-w-none 
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-300 prose-h1:pb-2 prose-h1:mb-4
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-strong:text-gray-900
                prose-code:text-purple-700 prose-code:bg-purple-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:text-sm
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:shadow-lg prose-pre:rounded-lg
                prose-table:border-collapse prose-table:w-full prose-table:shadow-sm
                prose-th:border prose-th:border-gray-300 prose-th:bg-gray-200 prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:text-gray-800
                prose-td:border prose-td:border-gray-300 prose-td:p-3 prose-td:bg-white prose-td:text-gray-700
                prose-ul:text-gray-700 prose-li:text-gray-700 prose-li:marker:text-purple-500
                prose-a:text-purple-600 prose-a:underline hover:prose-a:text-purple-800
                prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono shadow-lg">
                {content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
