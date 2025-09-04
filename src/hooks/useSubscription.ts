import { useState, useEffect, useCallback } from 'react';
import { subscriptionAPI, SubscriptionStatus, PricingInfo, APIError } from '../lib/api';

interface UseSubscriptionReturn {
  subscription: SubscriptionStatus | null;
  pricing: PricingInfo | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  canAccessFeature: (feature: string) => boolean;
  hasTrialSessions: () => boolean;
  useTrialSession: (feature: string, sessionId?: string) => Promise<boolean>;
  upgradeSubscription: (tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime') => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription status and pricing info
  const refreshSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [subscriptionData, pricingData] = await Promise.all([
        subscriptionAPI.getStatus(),
        subscriptionAPI.getPricing()
      ]);
      
      setSubscription(subscriptionData);
      setPricing(pricingData);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError(err instanceof APIError ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user can access a specific feature
  const canAccessFeature = useCallback((feature: string): boolean => {
    if (!subscription) return false;
    return subscription.features.includes(feature);
  }, [subscription]);

  // Check if user has trial sessions available
  const hasTrialSessions = useCallback((): boolean => {
    if (!subscription) return false;
    return subscription.trial_sessions_used < subscription.trial_sessions_limit;
  }, [subscription]);

  // Use a trial session for a specific feature
  const useTrialSession = useCallback(async (feature: string, sessionId?: string): Promise<boolean> => {
    try {
      const result = await subscriptionAPI.useTrial({ feature, session_id: sessionId });
      if (result.success) {
        // Refresh subscription status to get updated trial count
        await refreshSubscription();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to use trial session:', err);
      return false;
    }
  }, [refreshSubscription]);

  // Upgrade subscription
  const upgradeSubscription = useCallback(async (tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime'): Promise<boolean> => {
    try {
      const result = await subscriptionAPI.upgrade({ tier });
      if (result.success) {
        await refreshSubscription();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to upgrade subscription:', err);
      return false;
    }
  }, [refreshSubscription]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const result = await subscriptionAPI.cancel();
      if (result.success) {
        await refreshSubscription();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      return false;
    }
  }, [refreshSubscription]);

  // Load data on mount
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  return {
    subscription,
    pricing,
    loading,
    error,
    refreshSubscription,
    canAccessFeature,
    hasTrialSessions,
    useTrialSession,
    upgradeSubscription,
    cancelSubscription,
  };
};
