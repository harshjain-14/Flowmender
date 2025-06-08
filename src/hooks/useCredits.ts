import { useState, useEffect } from 'react';
import { UserCredits } from '../types';
import { CreditService } from '../services/CreditService';
import { useAuth } from './useAuth';

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userCredits = await CreditService.getUserCredits(user.id);
      setCredits(userCredits);
    } catch (err) {
      console.error('Error loading credits:', err);
      setError('Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, [user]);

  const deductCredits = async (analysisResultId?: string, creditsToDeduct: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await CreditService.deductCredits(user.id, analysisResultId, creditsToDeduct);
      if (success) {
        // Reload credits to get updated balance
        await loadCredits();
      }
      return success;
    } catch (err) {
      console.error('Error deducting credits:', err);
      setError('Failed to deduct credits');
      return false;
    }
  };

  const refreshCredits = () => {
    loadCredits();
  };

  return {
    credits,
    loading,
    error,
    deductCredits,
    refreshCredits,
  };
}