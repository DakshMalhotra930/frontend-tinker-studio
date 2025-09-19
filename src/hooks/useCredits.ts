import { useState, useEffect, useCallback } from 'react';
import { creditAPI, proSubscriptionAPI, APIError, apiUtils } from '../lib/api';

interface CreditStatus {
  user_id: string;
  credits_used: number;
  credits_remaining: number;
  credits_limit: number;
  credits_date: string;
  is_pro_user: boolean;
}

interface UseCreditsReturn {
  creditStatus: CreditStatus | null;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  consumeCredit: (featureName: string, sessionId?: string) => Promise<boolean>;
  isProUser: boolean;
  hasCredits: boolean;
  creditsRemaining: number;
  creditsLimit: number;
}

export const useCredits = (): UseCreditsReturn => {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCreditStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = apiUtils.getUserId();
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const status = await creditAPI.getCreditStatus(userId);
      setCreditStatus(status);
    } catch (err) {
      console.error('Error loading credit status:', err);
      setError(err instanceof APIError ? err.message : 'Failed to load credit status');
    } finally {
      setLoading(false);
    }
  }, []);

  const consumeCredit = useCallback(async (featureName: string, sessionId?: string): Promise<boolean> => {
    try {
      const userId = apiUtils.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // If user is Pro, no need to consume credits
      if (creditStatus?.is_pro_user) {
        return true;
      }

      const result = await creditAPI.consumeCredit({
        user_id: userId,
        feature_name: featureName,
        session_id: sessionId
      });
      
      console.log('💳 Credit consumption API response:', result);

      if (result.success) {
        console.log('✅ Credit consumed successfully! New credits remaining:', result.credits_remaining);
        // Update local state
        setCreditStatus(prev => prev ? {
          ...prev,
          credits_remaining: result.credits_remaining
        } : null);
        return true;
      } else {
        console.log('❌ Credit consumption failed:', result);
      }

      return false;
    } catch (err) {
      console.error('Error consuming credit:', err);
      return false;
    }
  }, [creditStatus?.is_pro_user]);

  const refreshCredits = useCallback(async () => {
    await loadCreditStatus();
  }, [loadCreditStatus]);

  // Load credits on mount
  useEffect(() => {
    loadCreditStatus();
  }, [loadCreditStatus]);

  return {
    creditStatus,
    loading,
    error,
    refreshCredits,
    consumeCredit,
    isProUser: creditStatus?.is_pro_user || false,
    hasCredits: (creditStatus?.credits_remaining || 0) > 0,
    creditsRemaining: creditStatus?.credits_remaining || 0,
    creditsLimit: creditStatus?.credits_limit || 5
  };
};

