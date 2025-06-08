import React from 'react';
import { Download, FileText, Code, FileImage } from 'lucide-react';
import { AnalysisResult } from '../types';
import { ReportGenerator } from '../services/ReportGenerator';

interface ExportOptionsProps {
  result: AnalysisResult;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ result }) => {
  const handleExport = async (format: 'markdown' | 'json' | 'pdf') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `prd-analysis-${result.documentName.replace(/\.[^/.]+$/, '')}-${timestamp}`;

    try {
      switch (format) {
        case 'markdown':
          const markdown = ReportGenerator.generateMarkdown(result);
          ReportGenerator.downloadFile(markdown, `${baseFilename}.md`, 'text/markdown');
          break;
        
        case 'json':
          const json = ReportGenerator.generateJSON(result);
          ReportGenerator.downloadFile(json, `${baseFilename}.json`, 'application/json');
          break;
        
        case 'pdf':
          const pdf = await ReportGenerator.generatePDF(result);
          ReportGenerator.downloadFile(pdf, `${baseFilename}.pdf`, 'application/pdf');
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const exportOptions = [
    {
      format: 'markdown' as const,
      label: 'Markdown Report',
      description: 'Human-readable report with formatting',
      icon: FileText,
      color: 'blue'
    },
    {
      format: 'json' as const,
      label: 'JSON Data',
      description: 'Structured data for further processing',
      icon: Code,
      color: 'green'
    },
    {
      format: 'pdf' as const,
      label: 'PDF Report',
      description: 'Professional document for sharing',
      icon: FileImage,
      color: 'purple'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Download className="h-5 w-5 mr-2" />
        Export Analysis
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exportOptions.map(({ format, label, description, icon: Icon, color }) => (
          <button
            key={format}
            onClick={() => handleExport(format)}
            className={`p-4 border-2 border-gray-200 rounded-lg hover:border-${color}-300 hover:bg-${color}-50 transition-all group text-left`}
          >
            <div className="flex items-center mb-2">
              <Icon className={`h-6 w-6 text-${color}-600 mr-3`} />
              <h4 className="font-medium text-gray-900">{label}</h4>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          💡 Tip: Use Markdown for documentation, JSON for data integration, and PDF for presentations.
        </p>
      </div>
    </div>
  );
};