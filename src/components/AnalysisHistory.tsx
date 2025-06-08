import React, { useState, useEffect } from 'react'
import { Brain, Calendar, FileText, Eye, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { DatabaseService } from '../services/DatabaseService'
import { AnalysisResult } from '../types'
import { useAuth } from '../hooks/useAuth'

interface AnalysisHistoryProps {
  onAnalysisSelect: (result: AnalysisResult) => void
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ onAnalysisSelect }) => {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadAnalyses()
    }
  }, [user])

  const loadAnalyses = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userAnalyses = await DatabaseService.getUserAnalysisResults(user.id)
      setAnalyses(userAnalyses)
    } catch (err) {
      setError('Failed to load analysis history')
      console.error('Error loading analyses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (analysisId: string) => {
    if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      return
    }

    try {
      await DatabaseService.deleteAnalysisResult(analysisId)
      setAnalyses(analyses.filter(analysis => analysis.id !== analysisId))
    } catch (err) {
      console.error('Error deleting analysis:', err)
      alert('Failed to delete analysis')
    }
  }

  const getSeverityColor = (criticalIssues: number) => {
    if (criticalIssues > 0) return 'text-red-600 bg-red-100'
    return 'text-green-600 bg-green-100'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your analysis history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading History</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAnalyses}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analysis History</h3>
          <p className="text-gray-600 mb-4">
            Run your first PRD analysis to see results here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analysis History</h2>
        <p className="text-gray-600">{analyses.length} analysis{analyses.length !== 1 ? 'es' : ''}</p>
      </div>

      <div className="space-y-4">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Brain className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">{analysis.documentName}</h3>
                </div>
                
                <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {analysis.analyzedAt.toLocaleDateString()}
                  </div>
                  {analysis.context.company && (
                    <div className="flex items-center">
                      <span className="font-medium">Company:</span>
                      <span className="ml-1">{analysis.context.company}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-blue-600 font-medium">Journeys</div>
                    <div className="text-lg font-bold text-blue-900">{analysis.summary.totalJourneys}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-sm text-yellow-600 font-medium">Issues</div>
                    <div className="text-lg font-bold text-yellow-900">{analysis.summary.totalEdgeCases}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-sm text-red-600 font-medium">Critical</div>
                    <div className="text-lg font-bold text-red-900">{analysis.summary.criticalIssues}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-sm text-green-600 font-medium">Score</div>
                    <div className="text-lg font-bold text-green-900">{analysis.summary.coverageScore}%</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(analysis.summary.criticalIssues)}`}>
                    {analysis.summary.criticalIssues > 0 ? (
                      <>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {analysis.summary.criticalIssues} Critical Issue{analysis.summary.criticalIssues !== 1 ? 's' : ''}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        No Critical Issues
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onAnalysisSelect(analysis)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </button>
                <button
                  onClick={() => handleDelete(analysis.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete analysis"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}