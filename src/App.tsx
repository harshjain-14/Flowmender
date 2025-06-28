import React, { useState, useEffect } from 'react'
import { Brain, Zap, LogIn, FileText, Users, Shield, CheckCircle, ArrowRight, Star, TrendingUp, Clock, Target, Mail, AlertTriangle, ExternalLink } from 'lucide-react'
import { FileUpload } from './components/FileUpload'
import { ContextForm } from './components/ContextForm'
import { ProcessingStatus } from './components/ProcessingStatus'
import { ResultsViewer } from './components/ResultsViewer'
import { ExportOptions } from './components/ExportOptions'
import { AuthModal } from './components/AuthModal'
import { UserMenu } from './components/UserMenu'
import { AnalysisHistory } from './components/AnalysisHistory'
import { AnalysisConfirmModal } from './components/AnalysisConfirmModal'
import { CreditDisplay } from './components/CreditDisplay'
import { EdgeCaseFinder } from './services/EdgeCaseFinder'
import { DatabaseService } from './services/DatabaseService'
import { CreditService } from './services/CreditService'
import { AnalyticsService } from './services/AnalyticsService'
import { PRDDocument, AnalysisResult, ProcessingStatus as Status } from './types'
import { useAuth } from './hooks/useAuth'
import { useCredits } from './hooks/useCredits'
import { supabase } from './lib/supabase'

function App() {
  const { user, loading: authLoading } = useAuth()
  const { credits, loading: creditsLoading, deductCredits, refreshCredits } = useCredits()
  const [document, setDocument] = useState<PRDDocument | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [context, setContext] = useState<{ company?: string; problemStatement?: string }>({})
  const [processingStatus, setProcessingStatus] = useState<Status>({
    stage: 'parsing',
    progress: 0,
    message: ''
  })
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAnalysisConfirm, setShowAnalysisConfirm] = useState(false)
  const [currentView, setCurrentView] = useState<'analyze' | 'history'>('analyze')
  const [emailVerificationMessage, setEmailVerificationMessage] = useState<string | null>(null)

  // Track page view on app load
  useEffect(() => {
    AnalyticsService.trackPageView('app_home')
  }, [])

  // Track user identification when user logs in
  useEffect(() => {
    if (user) {
      AnalyticsService.identifyUser(user.id, {
        email: user.email,
        email_verified: !!user.email_confirmed_at,
        created_at: user.created_at
      })
      AnalyticsService.trackAuth('signin')
    }
  }, [user])

  // Handle email verification success
  useEffect(() => {
    const handleAuthStateChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const type = urlParams.get('type')
      const accessToken = urlParams.get('access_token')
      
      if (type === 'signup' && accessToken) {
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        
        // Show success message
        setEmailVerificationMessage('Email verified successfully! Welcome to FlowMender.')
        
        // Track email verification
        AnalyticsService.trackAuth('email_verified')
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setEmailVerificationMessage(null)
        }, 5000)
      }
    }

    handleAuthStateChange()
  }, [])

  const handleFileUploaded = async (uploadedDocument: PRDDocument) => {
    setDocument(uploadedDocument)
    setAnalysisResult(null)
    setProcessingStatus({
      stage: 'parsing',
      progress: 0,
      message: ''
    })

    // Track file upload
    AnalyticsService.trackFileUpload('completed', {
      file_type: uploadedDocument.type,
      file_size: uploadedDocument.size,
      file_name: uploadedDocument.name
    })

    // Save document to database
    if (user) {
      try {
        const savedDocumentId = await DatabaseService.saveDocument(uploadedDocument, user.id)
        setDocumentId(savedDocumentId)
      } catch (error) {
        console.error('Failed to save document:', error)
      }
    }
  }

  const handleContextUpdate = (newContext: { company?: string; problemStatement?: string }) => {
    setContext(newContext)
    
    // Track context update
    AnalyticsService.trackUserAction('context_updated', {
      has_company: !!newContext.company,
      has_problem_statement: !!newContext.problemStatement
    })
  }

  const handleAnalyzeClick = () => {
    if (!document || !user) return
    
    // Track analysis initiation
    AnalyticsService.trackUserAction('analysis_initiated', {
      document_type: document.type,
      has_context: !!(context.company || context.problemStatement)
    })
    
    setShowAnalysisConfirm(true)
  }

  const handleAnalyzeConfirm = async () => {
    if (!document || !user) return

    // Check if user has enough credits
    const hasEnoughCredits = credits && credits.credits >= 1
    if (!hasEnoughCredits) {
      setShowAnalysisConfirm(false)
      AnalyticsService.trackCreditUsage('insufficient', {
        current_credits: credits?.credits || 0
      })
      alert('You need at least 1 credit to perform an analysis. Please contact support for more credits.')
      return
    }

    setShowAnalysisConfirm(false)
    setIsProcessing(true)
    EdgeCaseFinder.setProgressCallback(setProcessingStatus)

    // Track analysis start
    AnalyticsService.trackAnalysis('started', {
      document_type: document.type,
      document_size: document.size,
      has_context: !!(context.company || context.problemStatement)
    })

    try {
      const result = await EdgeCaseFinder.analyzeDocument(document, context)
      setAnalysisResult(result)

      // Save analysis result to database first
      if (documentId) {
        try {
          await DatabaseService.saveAnalysisResult(result, user.id, documentId)
          console.log('Analysis result saved successfully')
        } catch (error) {
          console.error('Failed to save analysis result:', error)
        }
      }

      // CRITICAL: Deduct credits after successful analysis
      try {
        console.log('Attempting to deduct credits for user:', user.id, 'analysis:', result.id)
        const creditDeducted = await deductCredits(result.id, 1)
        if (creditDeducted) {
          console.log('Credits deducted successfully')
          AnalyticsService.trackCreditUsage('deducted', {
            credits_used: 1,
            remaining_credits: (credits?.credits || 1) - 1
          })
        } else {
          console.error('Failed to deduct credits - insufficient balance or error')
          // Still show the analysis since it was completed, but log the issue
          alert('Analysis completed but there was an issue with credit deduction. Please contact support.')
        }
      } catch (error) {
        console.error('Error during credit deduction:', error)
        // Still show the analysis since it was completed
        alert('Analysis completed but there was an issue with credit deduction. Please contact support.')
      }

      // Track successful analysis
      AnalyticsService.trackAnalysis('completed', {
        total_journeys: result.summary.totalJourneys,
        total_edge_cases: result.summary.totalEdgeCases,
        critical_issues: result.summary.criticalIssues,
        coverage_score: result.summary.coverageScore
      })
    } catch (error: any) {
      console.error('Analysis failed:', error)
      
      let errorMessage = 'Analysis failed. Please try again.'
      
      if (error.message && error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please check your Google AI API billing and quota limits, or try again later.'
      } else if (error.message && error.message.includes('API key')) {
        errorMessage = 'API key issue. Please check your Gemini API key configuration.'
      } else if (error.message) {
        errorMessage = `Analysis failed: ${error.message}`
      }
      
      // Track analysis failure
      AnalyticsService.trackAnalysis('failed', {
        error_message: error.message,
        error_type: error.message?.includes('quota') ? 'quota_exceeded' : 
                   error.message?.includes('API key') ? 'api_key_issue' : 'unknown'
      })
      
      alert(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAnalysisSelect = (selectedResult: AnalysisResult) => {
    setAnalysisResult(selectedResult)
    setCurrentView('analyze')
    
    // Track analysis selection from history
    AnalyticsService.trackUserAction('analysis_selected_from_history', {
      analysis_id: selectedResult.id,
      document_name: selectedResult.documentName
    })
  }

  const handleUserMenuNavigate = (view: 'history') => {
    setCurrentView(view)
    
    // Track navigation
    AnalyticsService.trackPageView(`app_${view}`)
  }

  const canAnalyze = document && !isProcessing && user && credits && credits.credits >= 1

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show email verification message for unverified users
  if (user && !user.email_confirmed_at) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl text-center">
          <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Please Verify Your Email
          </h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            We've sent a verification link to <strong>{user.email}</strong>. 
            Please check your email and click the link to verify your account before you can access the application.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-blue-700 text-sm">
              <Clock className="h-4 w-4 mr-2" />
              <span>Don't forget to check your spam folder</span>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={async () => {
                const { error } = await supabase.auth.resend({
                  type: 'signup',
                  email: user.email!,
                  options: {
                    emailRedirectTo: `${window.location.origin}?type=signup`
                  }
                })
                if (error) {
                  alert('Failed to resend verification email')
                } else {
                  alert('Verification email sent! Please check your inbox.')
                  AnalyticsService.trackAuth('email_resent')
                }
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              Resend Verification Email
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut()
                AnalyticsService.trackAuth('signout')
              }}
              className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Sign out and try with a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                  <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">FlowMender</h1>
                  <p className="text-gray-600 text-xs sm:text-sm lg:text-base">AI-powered PRD analysis that catches what humans miss</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden sm:block bg-gradient-to-r from-yellow-400 to-orange-500 px-2 sm:px-3 py-1 rounded-full">
                  <div className="flex items-center text-white text-xs sm:text-sm font-medium">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Powered by Gemini AI
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAuthModal(true)
                    AnalyticsService.trackUserAction('auth_modal_opened', { source: 'header' })
                  }}
                  className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Get Started Free</span>
                  <span className="sm:hidden">Start</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <div className="text-center mb-8 sm:mb-16">
            <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Built with Google Gemini AI for comprehensive analysis
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              Catch Every Edge Case<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Before It Costs You
              </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
              Upload your PRD and let our AI identify missing user journeys, edge cases, and potential issues 
              that could derail your product launch. Save weeks of debugging and deliver better user experiences.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 sm:mb-8">
              <button
                onClick={() => {
                  setShowAuthModal(true)
                  AnalyticsService.trackUserAction('auth_modal_opened', { source: 'hero_cta' })
                }}
                className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium text-base sm:text-lg shadow-lg w-full sm:w-auto"
              >
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                Analyze Your PRD Free
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </button>
              <div className="text-xs sm:text-sm text-gray-500 text-center">
                No credit card required • Email verification required
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-16">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">50%</div>
              <div className="text-gray-600 text-xs sm:text-sm">of bugs originate from unconsidered edge cases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">3.5x</div>
              <div className="text-gray-600 text-xs sm:text-sm">more expensive to fix issues found during QA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">78%</div>
              <div className="text-gray-600 text-xs sm:text-sm">of user experiences break at flow boundaries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">40%</div>
              <div className="text-gray-600 text-xs sm:text-sm">of dev time spent fixing preventable issues</div>
            </div>
          </div>

          {/* Example Analysis Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-8 mb-8 sm:mb-16">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
              See What Our AI Catches in Real PRDs
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                  User Journey Analysis
                </h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="font-medium text-blue-900 text-sm sm:text-base">New User Onboarding</div>
                    <div className="text-xs sm:text-sm text-blue-700 mt-1">5 steps identified • High priority</div>
                    <div className="text-xs text-blue-600 mt-2">✓ Email verification flow detected</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <div className="font-medium text-green-900 text-sm sm:text-base">Payment Processing</div>
                    <div className="text-xs sm:text-sm text-green-700 mt-1">8 steps identified • Critical priority</div>
                    <div className="text-xs text-green-600 mt-2">✓ Error handling paths mapped</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
                    <div className="font-medium text-purple-900 text-sm sm:text-base">Admin Dashboard Access</div>
                    <div className="text-xs sm:text-sm text-purple-700 mt-1">3 steps identified • Medium priority</div>
                    <div className="text-xs text-purple-600 mt-2">✓ Permission checks validated</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2" />
                  Critical Issues Found
                </h4>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start">
                      <div className="bg-red-100 p-1 rounded mr-2 sm:mr-3 mt-0.5">
                        <span className="text-red-600 text-xs font-bold">CRITICAL</span>
                      </div>
                      <div>
                        <div className="font-medium text-red-900 text-sm sm:text-base">Missing Password Reset Flow</div>
                        <div className="text-xs sm:text-sm text-red-700 mt-1">Users cannot recover locked accounts</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start">
                      <div className="bg-yellow-100 p-1 rounded mr-2 sm:mr-3 mt-0.5">
                        <span className="text-yellow-600 text-xs font-bold">MODERATE</span>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-900 text-sm sm:text-base">Inconsistent Error Messages</div>
                        <div className="text-xs sm:text-sm text-yellow-700 mt-1">Payment errors show different formats</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start">
                      <div className="bg-orange-100 p-1 rounded mr-2 sm:mr-3 mt-0.5">
                        <span className="text-orange-600 text-xs font-bold">UX GAP</span>
                      </div>
                      <div>
                        <div className="font-medium text-orange-900 text-sm sm:text-base">Missing Loading States</div>
                        <div className="text-xs sm:text-sm text-orange-700 mt-1">No feedback during file uploads</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowAuthModal(true)
                  AnalyticsService.trackUserAction('auth_modal_opened', { source: 'example_analysis' })
                }}
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm sm:text-base"
              >
                Try This Analysis on Your PRD
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-16">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Smart Document Analysis</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Upload PDF, DOCX, or text files. Our AI automatically extracts and analyzes all user journeys, 
                workflows, and business logic from your PRD.
              </p>
              <div className="text-xs sm:text-sm text-blue-600 font-medium">
                ✓ Supports all major document formats
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="bg-red-100 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Advanced Edge Case Detection</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Identify missing flows, inconsistencies, UX gaps, and logical contradictions that could 
                impact user experience and product success.
              </p>
              <div className="text-xs sm:text-sm text-red-600 font-medium">
                ✓ Catches issues humans typically miss
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Team Collaboration</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Export findings as PDF, Markdown, or JSON. Save analysis history and share insights 
                with your team for better product planning.
              </p>
              <div className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Multiple export formats included
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 sm:p-12 text-white mb-8 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">
              Why Product Teams Choose FlowMender
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3 sm:mr-4 mt-1">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Reduce Development Bugs by 50%</h4>
                    <p className="text-blue-100 text-xs sm:text-sm">Catch edge cases before development starts, saving time and resources on costly fixes.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3 sm:mr-4 mt-1">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Ship Products 3x Faster</h4>
                    <p className="text-blue-100 text-xs sm:text-sm">Eliminate weeks of back-and-forth by identifying issues during the planning phase.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3 sm:mr-4 mt-1">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Improve User Experience</h4>
                    <p className="text-blue-100 text-xs sm:text-sm">Ensure every user journey is smooth and every edge case is handled gracefully.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3 sm:mr-4 mt-1">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Launch with Confidence</h4>
                    <p className="text-blue-100 text-xs sm:text-sm">Know that your product is thoroughly analyzed and ready for real-world usage.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
              Ready to Build Better Products?
            </h3>
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join hundreds of product teams who trust FlowMender to catch critical issues before they impact users.
            </p>
            <button
              onClick={() => {
                setShowAuthModal(true)
                AnalyticsService.trackUserAction('auth_modal_opened', { source: 'bottom_cta' })
              }}
              className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium text-base sm:text-lg shadow-lg"
            >
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
              Start Your Free Analysis
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl mr-3">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">FlowMender</span>
              </div>
              <p className="text-gray-400 text-sm sm:text-base mb-4">
                AI-powered PRD analysis that catches what humans miss
              </p>
              <div className="text-xs sm:text-sm text-gray-500">
                © 2025 FlowMender. Built with Google Gemini AI.
              </div>
            </div>
          </div>
        </footer>

        {/* Auth Modal */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    )
  }

  // Main application for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Email verification success message */}
      {emailVerificationMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 text-center">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {emailVerificationMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">FlowMender</h1>
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base">AI-powered PRD analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <CreditDisplay credits={credits} loading={creditsLoading} />
              <UserMenu user={user} onNavigate={handleUserMenuNavigate} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentView === 'history' ? (
          <AnalysisHistory onAnalysisSelect={handleAnalysisSelect} />
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* File Upload Section */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Upload Your PRD</h2>
              <FileUpload onFileUploaded={handleFileUploaded} />
            </div>

            {/* Context Form Section */}
            {document && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Additional Context (Optional)</h2>
                <ContextForm onContextUpdate={handleContextUpdate} />
              </div>
            )}

            {/* Analysis Button */}
            {document && (
              <div className="text-center">
                <button
                  onClick={handleAnalyzeClick}
                  disabled={!canAnalyze}
                  className={`inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium text-base sm:text-lg transition-all transform ${
                    canAnalyze
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                  {isProcessing ? 'Analyzing...' : 'Analyze PRD (1 Credit)'}
                  {!isProcessing && <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />}
                </button>
                {!canAnalyze && !isProcessing && (
                  <p className="text-sm text-gray-500 mt-2">
                    {!user ? 'Please sign in to analyze' : 
                     !credits || credits.credits < 1 ? 'Insufficient credits' : 
                     'Upload a document to analyze'}
                  </p>
                )}
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
                <ProcessingStatus status={processingStatus} />
              </div>
            )}

            {/* Results */}
            {analysisResult && !isProcessing && (
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
                  <ResultsViewer result={analysisResult} />
                </div>
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
                  <ExportOptions result={analysisResult} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Confirmation Modal */}
      <AnalysisConfirmModal
        isOpen={showAnalysisConfirm}
        onClose={() => setShowAnalysisConfirm(false)}
        onConfirm={handleAnalyzeConfirm}
        credits={credits}
      />
    </div>
  )
}

export default App