'use client';

import { useCallback, useState } from 'react';
import { Upload, X, FileCode, FileCheck } from 'lucide-react';
import { ContractFile } from '@/lib/types';

interface FileUploadProps {
  label: string;
  description: string;
  accept?: string;
  multiple?: boolean;
  files: ContractFile[];
  onFilesChange: (files: ContractFile[]) => void;
  type: 'contract' | 'test';
}

export default function FileUpload({
  label,
  description,
  accept = '.sol',
  multiple = true,
  files,
  onFilesChange,
  type,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: ContractFile[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.name.endsWith('.sol')) {
          const content = await file.text();
          newFiles.push({
            name: file.name,
            content,
            type,
          });
        }
      }

      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange, type]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${
            isDragging
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isDragging ? 'bg-purple-100' : 'bg-gray-100'}
          `}
          >
            <Upload
              className={`w-6 h-6 ${
                isDragging ? 'text-purple-600' : 'text-gray-400'
              }`}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              Drop your <span className="text-purple-600">.sol</span> files here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse from your computer
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200"
            >
              <div className="flex items-center gap-3">
                {type === 'contract' ? (
                  <FileCode className="w-5 h-5 text-purple-600" />
                ) : (
                  <FileCheck className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.content.split('\n').length} lines
                  </p>
                </div>
              </div>

              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
