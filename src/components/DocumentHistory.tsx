import React, { useState, useEffect } from 'react'
import { FileText, Calendar, Download, Trash2, Eye, Upload } from 'lucide-react'
import { DatabaseService } from '../services/DatabaseService'
import { PRDDocument } from '../types'
import { useAuth } from '../hooks/useAuth'

interface DocumentHistoryProps {
  onDocumentSelect: (document: PRDDocument) => void
}

export const DocumentHistory: React.FC<DocumentHistoryProps> = ({ onDocumentSelect }) => {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<PRDDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user])

  const loadDocuments = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userDocuments = await DatabaseService.getUserDocuments(user.id)
      setDocuments(userDocuments)
    } catch (err) {
      setError('Failed to load documents')
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      await DatabaseService.deleteDocument(documentId)
      setDocuments(documents.filter(doc => doc.id !== documentId))
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Failed to delete document')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄'
      case 'docx':
        return '📝'
      default:
        return '📄'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Documents</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDocuments}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-gray-600 mb-4">
            Upload your first PRD document to get started with AI analysis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Documents</h2>
        <p className="text-gray-600">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((document) => (
          <div key={document.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getFileTypeIcon(document.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate" title={document.name}>
                    {document.name}
                  </h3>
                  <p className="text-sm text-gray-500">{document.type.toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {document.uploadedAt.toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Download className="h-4 w-4 mr-2" />
                {formatFileSize(document.size)}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onDocumentSelect(document)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Eye className="h-4 w-4 mr-2" />
                Analyze
              </button>
              <button
                onClick={() => handleDelete(document.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}