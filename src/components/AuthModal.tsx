import React, { useState } from 'react'
import { X, Mail, Lock, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { AnalyticsService } from '../services/AnalyticsService'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Track auth attempt
    AnalyticsService.trackAuth(isSignUp ? 'signup' : 'signin', {
      email_domain: email.split('@')[1]
    })

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email first. Check your inbox for a verification link.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Make sure your email is verified.')
        } else if (error.message.includes('Email rate limit exceeded')) {
          setError('Too many emails sent. Please wait a few minutes before trying again.')
        } else if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.')
        } else {
          setError(error.message)
        }

        // Track auth failure
        AnalyticsService.trackUserAction('auth_failed', {
          type: isSignUp ? 'signup' : 'signin',
          error_type: error.message.includes('Email not confirmed') ? 'email_not_confirmed' :
                     error.message.includes('Invalid login credentials') ? 'invalid_credentials' :
                     error.message.includes('User already registered') ? 'user_exists' : 'other',
          error_message: error.message
        })
      } else {
        if (isSignUp) {
          setSuccess('Account created! Please check your email and click the verification link. You must verify your email before you can sign in.')
          setEmail('')
          setPassword('')
          
          // Track successful signup
          AnalyticsService.trackAuth('signup', { email_domain: email.split('@')[1] })
        } else {
          onClose()
          setEmail('')
          setPassword('')
          
          // Track successful signin (user identification happens in App.tsx)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      
      // Track unexpected error
      AnalyticsService.trackUserAction('auth_error', {
        type: isSignUp ? 'signup' : 'signin',
        error: 'unexpected_error'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
  }

  const switchMode = () => {
    setIsSignUp(!isSignUp)
    resetForm()
    
    // Track mode switch
    AnalyticsService.trackUserAction('auth_mode_switched', {
      to: !isSignUp ? 'signup' : 'signin'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <button
              onClick={() => {
                onClose()
                AnalyticsService.trackUserAction('auth_modal_closed')
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Lock className="h-4 w-4 mr-2" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                placeholder="Enter your password"
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-700">{success}</p>
                    <div className="flex items-center mt-2 text-xs text-green-600">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Check your email inbox and spam folder</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          {isSignUp && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                By creating an account, you agree to our Terms of Service and Privacy Policy. 
                <strong> Email verification is required</strong> before you can access the application.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}