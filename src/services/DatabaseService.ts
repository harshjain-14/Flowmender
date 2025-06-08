import { supabase } from '../lib/supabase'
import { PRDDocument, AnalysisResult } from '../types'

export class DatabaseService {
  static async saveDocument(document: PRDDocument, userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        name: document.name,
        content: document.content,
        type: document.type,
        size: document.size,
        uploaded_at: document.uploadedAt.toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error saving document:', error)
      throw new Error('Failed to save document')
    }

    return data.id
  }

  static async saveAnalysisResult(result: AnalysisResult, userId: string, documentId: string): Promise<void> {
    const { error } = await supabase
      .from('analysis_results')
      .insert({
        user_id: userId,
        document_id: documentId,
        document_name: result.documentName,
        analyzed_at: result.analyzedAt.toISOString(),
        context: result.context,
        journeys: result.journeys,
        edge_cases: result.edgeCases,
        summary: result.summary,
      })

    if (error) {
      console.error('Error saving analysis result:', error)
      throw new Error('Failed to save analysis result')
    }
  }

  static async getUserDocuments(userId: string): Promise<PRDDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      throw new Error('Failed to fetch documents')
    }

    return data.map(doc => ({
      id: doc.id,
      name: doc.name,
      content: doc.content,
      type: doc.type as 'pdf' | 'docx' | 'text',
      size: doc.size,
      uploadedAt: new Date(doc.uploaded_at),
    }))
  }

  static async getUserAnalysisResults(userId: string): Promise<AnalysisResult[]> {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analysis results:', error)
      throw new Error('Failed to fetch analysis results')
    }

    return data.map(result => ({
      id: result.id,
      documentName: result.document_name,
      analyzedAt: new Date(result.analyzed_at),
      context: result.context || {},
      journeys: result.journeys || [],
      edgeCases: result.edge_cases || [],
      summary: result.summary || {
        totalJourneys: 0,
        totalEdgeCases: 0,
        criticalIssues: 0,
        coverageScore: 0,
      },
    }))
  }

  static async deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      console.error('Error deleting document:', error)
      throw new Error('Failed to delete document')
    }
  }

  static async deleteAnalysisResult(analysisId: string): Promise<void> {
    const { error } = await supabase
      .from('analysis_results')
      .delete()
      .eq('id', analysisId)

    if (error) {
      console.error('Error deleting analysis result:', error)
      throw new Error('Failed to delete analysis result')
    }
  }
}