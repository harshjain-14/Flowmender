import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { DocumentParser } from '../services/DocumentParser';
import { PRDDocument } from '../types';

interface FileUploadProps {
  onFileUploaded: (document: PRDDocument) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, isProcessing }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    setUploadError(null);
    setUploadedFile(file);

    try {
      // Validate file type
      const validTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];

      if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
        throw new Error('Please upload a PDF, DOCX, or TXT file');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      setIsValidating(true);
      const document = await DocumentParser.parseFile(file);
      setIsValidating(false);
      
      // Simple validation - just check if it has reasonable content
      if (document.content.trim().length < 50) {
        throw new Error('Document appears to be too short or empty');
      }
      
      onFileUploaded(document);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
      setUploadedFile(null);
      setIsValidating(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadError(null);
    setIsValidating(false);
  };

  if (isValidating) {
    return (
      <div className="bg-white rounded-xl border-2 border-blue-200 p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-medium text-blue-900 text-sm sm:text-base">Processing Document</h3>
            <p className="text-xs sm:text-sm text-blue-700">Parsing your document content...</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600">
            This may take a few seconds depending on document size.
          </p>
        </div>
      </div>
    );
  }

  if (uploadedFile && !uploadError) {
    return (
      <div className="bg-white rounded-xl border-2 border-green-200 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <File className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate text-sm sm:text-base">{uploadedFile.name}</p>
              <p className="text-xs sm:text-sm text-gray-500">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex items-center mt-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-1" />
                <span className="text-xs text-green-600">
                  Document ready for analysis
                </span>
              </div>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={removeFile}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
        Upload your PRD document
      </h3>
      <p className="text-gray-500 mb-4 text-sm sm:text-base">
        Drag and drop your file here, or click to browse
      </p>
      <p className="text-xs sm:text-sm text-gray-400 mb-6">
        Supports PDF, DOCX, and TXT files (max 10MB)
      </p>
      
      <label className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm sm:text-base">
        <Upload className="h-4 w-4 mr-2" />
        Choose file
        <input
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
      </label>

      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        </div>
      )}
    </div>
  );
};