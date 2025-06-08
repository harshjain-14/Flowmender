import React, { useState } from 'react'
import { User, LogOut, History } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface UserMenuProps {
  onNavigate?: (view: 'history') => void
}

export const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const handleNavigation = (view: 'history') => {
    if (onNavigate) {
      onNavigate(view)
    }
    setIsOpen(false)
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {user.email}
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-500">Signed in</p>
            </div>
            
            <div className="py-1">
              <button 
                onClick={() => handleNavigation('history')}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <History className="h-4 w-4 mr-2" />
                Analysis History
              </button>
            </div>
            
            <div className="border-t border-gray-200 py-1">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}