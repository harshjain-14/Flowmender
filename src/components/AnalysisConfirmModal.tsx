import React from 'react'
import { X, AlertTriangle, Zap, CreditCard, Plus } from 'lucide-react'
import { UserCredits } from '../types'

interface AnalysisConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onBuyCredits?: () => void
  documentName: string
  credits: UserCredits | null
}

export const AnalysisConfirmModal: React.FC<AnalysisConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onBuyCredits,
  documentName,
  credits
}) => {
  if (!isOpen) return null

  const creditCount = credits?.credits ?? 0
  const hasEnoughCredits = creditCount >= 1

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {hasEnoughCredits ? 'Confirm Analysis' : 'Insufficient Credits'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">AI Analysis Ready</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Document: <strong>{documentName}</strong>
            </p>
          </div>

          {hasEnoughCredits ? (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Credit Usage</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This analysis will consume 1 credit from your account. Each analysis provides comprehensive 
                      edge case detection and user journey mapping.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <span className="font-medium text-green-900">Available Credits</span>
                    <p className="text-sm text-green-700">
                      {creditCount} credit{creditCount !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">No Credits Available</h4>
                    <p className="text-sm text-red-700 mt-1">
                      You need at least 1 credit to perform an analysis. Purchase more credits to continue.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <span className="font-medium text-blue-900">Current Balance</span>
                    <p className="text-sm text-blue-700">
                      {creditCount} credit{creditCount !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          {hasEnoughCredits ? (
            <button
              onClick={onConfirm}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
            >
              Start AI Analysis
            </button>
          ) : (
            <button
              onClick={onBuyCredits}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buy Credits
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {hasEnoughCredits && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 Need more analyses? Get 3 credits for ₹89 or save with larger packages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}