import { useState, useEffect, useCallback } from 'react';
import { subscriptionAPI, SubscriptionResponse, SubscriptionStatus, SubscriptionTier, PricingInfo, APIError, apiUtils } from '../lib/api';

interface UseSubscriptionReturn {
  subscription: SubscriptionResponse | null;
  pricing: PricingInfo | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  canAccessFeature: (feature: string) => boolean;
  hasTrialSessions: () => boolean;
  useTrialSession: (feature: string, sessionId?: string) => Promise<boolean>;
  upgradeSubscription: (tier: SubscriptionTier) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription status and pricing info
  const refreshSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!apiUtils.isAuthenticated()) {
        console.log('User not authenticated, skipping subscription load');
        setLoading(false);
        return;
      }
      
      const userId = apiUtils.getUserId();
      
      // Load subscription data and pricing
      const [subscriptionData, pricingData] = await Promise.all([
        subscriptionAPI.getStatus(userId),
        subscriptionAPI.getPricing()
      ]);
      
      setSubscription(subscriptionData);
      setPricing(pricingData);
      
      console.log('Subscription data loaded:', subscriptionData);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError(err instanceof APIError ? err.message : 'Failed to load subscription data');
      
      // Set default values on error
      const defaultSubscription: SubscriptionResponse = {
        status: SubscriptionStatus.FREE,
        tier: SubscriptionTier.FREE,
        trial_sessions_used: 0,
        trial_sessions_limit: 3,
        trial_reset_date: new Date().toISOString().split('T')[0],
        features: ['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve'],
        user_id: apiUtils.getUserId()
      };
      
      setSubscription(defaultSubscription);
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
    if (!subscription) {
      console.log('No subscription data available');
      return false;
    }
    
    // Only free users can use trial sessions
    if (subscription.status !== SubscriptionStatus.FREE) {
      return false;
    }
    
    console.log('Trial check - used:', subscription.trial_sessions_used, 'limit:', subscription.trial_sessions_limit);
    return subscription.trial_sessions_used < subscription.trial_sessions_limit;
  }, [subscription]);

  // Use a trial session for a specific feature
  const useTrialSession = useCallback(async (feature: string, sessionId?: string): Promise<boolean> => {
    try {
      // Check authentication first
      if (!apiUtils.isAuthenticated()) {
        console.error('User not authenticated');
        setError('Authentication required. Please log in.');
        return false;
      }

      // Check if user has trial sessions available
      if (!subscription || subscription.trial_sessions_used >= subscription.trial_sessions_limit) {
        console.log('No trial sessions available');
        return false;
      }

      // Map frontend feature names to backend expected names
      const featureMapping: { [key: string]: string } = {
        'deep_study_mode': 'Deep Study Mode',
        'study_plan': 'Study Plan Generator',
        'advanced_quiz': 'Advanced Quiz'
      };
      
      const backendFeatureName = featureMapping[feature] || feature;
      
      // Call the backend API to consume a trial
      const trialRequest = { 
        user_id: apiUtils.getUserId(),
        feature: backendFeatureName
      };
      
      console.log('Making trial usage request:', trialRequest);
      console.log('Request will be sent to: /agentic/subscription/trial/use');
      console.log('Expected format: { user_id: string, feature: string }');
      const result = await subscriptionAPI.useTrial(trialRequest);
      
      console.log('Backend response:', result);
      console.log('Response success field:', result.success);
      console.log('Response message:', result.message);
      console.log('Response trial_sessions_remaining:', result.trial_sessions_remaining);
      
      if (result.success) {
        // Update local state with new trial count
        setSubscription(prev => prev ? {
          ...prev,
          trial_sessions_used: prev.trial_sessions_used + 1,
          features: [...prev.features, feature]
        } : null);
        
        console.log('Trial session used successfully:', result.message);
        console.log('Trial sessions remaining:', result.trial_sessions_remaining);
        return true;
      } else {
        console.error('Failed to use trial session:', result.message);
        console.error('Response details:', result);
        return false;
      }
    } catch (err) {
      console.error('Failed to use trial session:', err);
      if (err instanceof Error) {
        console.error('Error details:', err.message);
      }
      return false;
    }
  }, [subscription]);

  // Upgrade subscription
  const upgradeSubscription = useCallback(async (tier: SubscriptionTier): Promise<boolean> => {
    try {
      const result = await subscriptionAPI.upgrade({ tier: tier as any });
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
      const userId = apiUtils.getUserId();
      const result = await subscriptionAPI.cancel(userId);
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
