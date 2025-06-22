import React from 'react';
import { CreditCard, Zap } from 'lucide-react';
import { UserCredits } from '../types';

interface CreditDisplayProps {
  credits: UserCredits | null;
  loading: boolean;
  showBuyButton?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  credits,
  loading,
  showBuyButton = false,
  size = 'medium'
}) => {
  if (loading) {
    return (
      <div className={`flex items-center ${size === 'small' ? 'space-x-2' : 'space-x-3'}`}>
        <div className="animate-pulse bg-gray-200 rounded-lg h-8 w-20"></div>
      </div>
    );
  }

  const creditCount = credits?.credits ?? 0;
  const isLowCredits = creditCount <= 1;
  const isOutOfCredits = creditCount === 0;

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base'
  };

  const iconSizes = {
    small: 'h-3 w-3',
    medium: 'h-4 w-4',
    large: 'h-5 w-5'
  };

  return (
    <div className={`flex items-center ${size === 'small' ? 'space-x-2' : 'space-x-3'}`}>
      <div className={`flex items-center ${sizeClasses[size]} rounded-lg border ${
        isOutOfCredits 
          ? 'bg-red-50 border-red-200 text-red-700' 
          : isLowCredits 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        <CreditCard className={`${iconSizes[size]} mr-1`} />
        <span className="font-medium">
          {creditCount} credit{creditCount !== 1 ? 's' : ''}
        </span>
        {credits?.total_purchased > 0 && size !== 'small' && (
          <span className="ml-1 text-xs opacity-75">
            ({credits.total_purchased} total)
          </span>
        )}
      </div>

      {isOutOfCredits && (
        <div className={`flex items-center ${sizeClasses[size]} bg-red-100 text-red-700 rounded-lg border border-red-200`}>
          <Zap className={`${iconSizes[size]} mr-1`} />
          <span className="font-medium">No credits</span>
        </div>
      )}
    </div>
  );
};