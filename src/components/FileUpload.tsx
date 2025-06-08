import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { DocumentParser } from '../services/DocumentParser';
import { DocumentValidator } from '../services/DocumentValidator';
import { PRDDocument } from '../types';

interface FileUploadProps {
  onFileUploaded: (document: PRDDocument) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, isProcessing }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isPRD: boolean;
    confidence: number;
    reasons: string[];
  } | null>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<PRDDocument | null>(null);
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
    setValidationResult(null);
    setShowValidationWarning(false);
    setPendingDocument(null);
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

      const document = await DocumentParser.parseFile(file);
      
      // Validate if it's a PRD using AI
      setIsValidating(true);
      try {
        const validation = await DocumentValidator.validatePRD(document.content);
        setValidationResult(validation);
        setIsValidating(false);
        
        if (!validation.isPRD && validation.confidence < 50) {
          setPendingDocument(document);
          setShowValidationWarning(true);
        } else {
          onFileUploaded(document);
        }
      } catch (validationError) {
        console.error('Validation failed:', validationError);
        setIsValidating(false);
        // If validation fails, proceed with the document
        onFileUploaded(document);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
      setUploadedFile(null);
      setIsValidating(false);
    }
  };

  const handleProceedAnyway = () => {
    if (pendingDocument) {
      onFileUploaded(pendingDocument);
      setShowValidationWarning(false);
      setPendingDocument(null);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadError(null);
    setValidationResult(null);
    setShowValidationWarning(false);
    setPendingDocument(null);
    setIsValidating(false);
  };

  if (isValidating) {
    return (
      <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-medium text-blue-900">Validating Document</h3>
            <p className="text-sm text-blue-700">AI is analyzing if this is a PRD document...</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600">
            This may take a few seconds. We're using AI to ensure optimal analysis results.
          </p>
        </div>
      </div>
    );
  }

  if (showValidationWarning && validationResult && pendingDocument) {
    return (
      <div className="bg-white rounded-xl border-2 border-yellow-200 p-6">
        <div className="flex items-start space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900 mb-2">
              Document Validation Warning
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              Our AI analysis suggests this document may not be a typical PRD (Product Requirements Document). 
              Confidence: {validationResult.confidence}%
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">AI Analysis Notes:</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                {validationResult.reasons.map((reason, index) => (
                  <li key={index}>• {reason}</li>
                ))}
              </ul>
            </div>
            
            <p className="text-sm text-yellow-700 mb-4">
              <strong>Proceeding with analysis may result in:</strong>
            </p>
            <ul className="text-xs text-yellow-600 space-y-1 mb-4">
              <li>• Inconsistent or irrelevant edge case detection</li>
              <li>• Random or nonsensical user journey extraction</li>
              <li>• Inaccurate analysis results</li>
              <li>• Wasted analysis credit</li>
            </ul>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleProceedAnyway}
            className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
          >
            Proceed Anyway
          </button>
          <button
            onClick={removeFile}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            Upload Different File
          </button>
        </div>
      </div>
    );
  }

  if (uploadedFile && !uploadError && !showValidationWarning) {
    return (
      <div className="bg-white rounded-xl border-2 border-green-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {validationResult && (
                <div className="flex items-center mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">
                    PRD validated ({validationResult.confidence}% confidence)
                  </span>
                </div>
              )}
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={removeFile}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Upload your PRD document
      </h3>
      <p className="text-gray-500 mb-4">
        Drag and drop your file here, or click to browse
      </p>
      <p className="text-sm text-gray-400 mb-6">
        Supports PDF, DOCX, and TXT files (max 10MB)
      </p>
      
      <label className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
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