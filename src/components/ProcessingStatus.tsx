import React from 'react';
import { Loader2, CheckCircle, Target, Zap, AlertTriangle, CreditCard } from 'lucide-react';
import { ProcessingStatus as Status, UserCredits } from '../types';
import { CreditDisplay } from './CreditDisplay';

interface ProcessingStatusProps {
  status: Status;
  onAnalyze: () => void;
  canAnalyze: boolean;
  credits: UserCredits | null;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ 
  status, 
  onAnalyze, 
  canAnalyze,
  credits
}) => {
  const isProcessing = status.stage !== 'complete' && status.progress > 0;
  const isComplete = status.stage === 'complete';
  const hasEnoughCredits = credits && credits.credits >= 1;

  if (!isProcessing && !isComplete && canAnalyze) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="mb-4">
          <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mb-3">
            <Zap className="h-4 w-4 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-700">Powered by Google Gemini AI</span>
          </div>
        </div>
        
        {/* Credit Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <div className="flex items-center justify-center">
            <CreditDisplay 
              credits={credits} 
              loading={false} 
              showBuyButton={false}
              size="medium"
            />
          </div>
        </div>
        
        <button
          onClick={onAnalyze}
          disabled={!hasEnoughCredits}
          className={`inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
            hasEnoughCredits 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Target className="h-5 w-5 mr-2" />
          {hasEnoughCredits ? 'Analyze PRD with AI' : 'Insufficient Credits'}
        </button>
        <p className="text-sm text-gray-500 mt-2">
          AI will extract user journeys and identify edge cases
        </p>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
          <div className="flex items-center text-yellow-700 text-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>This will consume 1 analysis credit</span>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="h-5 w-5 text-purple-600 mr-2" />
            AI Processing Document
          </h3>
          <div className="flex items-center text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="font-medium">{status.progress}%</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        
        <p className="text-gray-600 flex items-center">
          <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
          {status.message}
        </p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="bg-green-50 rounded-xl border border-green-200 p-6">
        <div className="flex items-center">
          <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 flex items-center">
              AI Analysis Complete!
              <Zap className="h-4 w-4 text-green-600 ml-2" />
            </h3>
            <p className="text-green-700">Your PRD has been thoroughly analyzed by Google Gemini AI.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};