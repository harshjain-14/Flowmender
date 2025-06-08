import React, { useState } from 'react';
import { Building, Target } from 'lucide-react';

interface ContextFormProps {
  onContextUpdate: (context: { company?: string; problemStatement?: string }) => void;
  disabled: boolean;
}

export const ContextForm: React.FC<ContextFormProps> = ({ onContextUpdate, disabled }) => {
  const [company, setCompany] = useState('');
  const [problemStatement, setProblemStatement] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContextUpdate({
      company: company.trim() || undefined,
      problemStatement: problemStatement.trim() || undefined
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Additional Context (Optional)
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Building className="h-4 w-4 mr-2" />
            Company Name
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={disabled}
            placeholder="e.g., Acme Corp"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Target className="h-4 w-4 mr-2" />
            Problem Statement
          </label>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            disabled={disabled}
            placeholder="Describe the core problem this product aims to solve..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
          />
        </div>
      </form>
    </div>
  );
};