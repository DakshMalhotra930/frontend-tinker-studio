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
      
      // For now, set default values since backend endpoints are not ready
      const defaultSubscription: SubscriptionStatus = {
        status: 'free',
        tier: 'free',
        trial_sessions_used_today: 0,
        trial_sessions_limit_daily: 10,
        last_trial_reset_date: new Date().toISOString().split('T')[0], // Today's date
        features: ['quick_help', 'start_study_session'] // Start Study Session is now free
      };
      
      const defaultPricing: PricingInfo = {
        monthly: {
          price: 9.99,
          currency: 'USD',
          features: ['Deep Study Mode', 'Advanced Quiz', 'Unlimited Sessions']
        },
        yearly: {
          price: 99.99,
          currency: 'USD',
          features: ['Deep Study Mode', 'Advanced Quiz', 'Unlimited Sessions', 'Priority Support'],
          discount: '17%'
        },
        lifetime: {
          price: 299.99,
          currency: 'USD',
          features: ['Deep Study Mode', 'Advanced Quiz', 'Unlimited Sessions', 'Priority Support', 'Lifetime Access']
        }
      };
      
      setSubscription(defaultSubscription);
      setPricing(defaultPricing);
      
      console.log('Default subscription set:', defaultSubscription);
      
      // TODO: Uncomment when backend endpoints are ready
      // const [subscriptionData, pricingData] = await Promise.all([
      //   subscriptionAPI.getStatus(),
      //   subscriptionAPI.getPricing()
      // ]);
      // setSubscription(subscriptionData);
      // setPricing(pricingData);
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

  // Check if user has trial sessions available today
  const hasTrialSessions = useCallback((): boolean => {
    if (!subscription) {
      console.log('No subscription data available');
      return false;
    }
    console.log('Trial check - used:', subscription.trial_sessions_used_today, 'limit:', subscription.trial_sessions_limit_daily);
    return subscription.trial_sessions_used_today < subscription.trial_sessions_limit_daily;
  }, [subscription]);

  // Use a trial session for a specific feature
  const useTrialSession = useCallback(async (feature: string, sessionId?: string): Promise<boolean> => {
    try {
      // Check if user has trial sessions available
      if (!subscription || subscription.trial_sessions_used_today >= subscription.trial_sessions_limit_daily) {
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
        user_id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
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
          trial_sessions_used_today: prev.trial_sessions_used_today + 1,
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
  const upgradeSubscription = useCallback(async (tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime'): Promise<boolean> => {
    try {
      // For now, simulate upgrade since backend endpoints are not ready
      setSubscription(prev => prev ? {
        ...prev,
        status: 'pro',
        tier: tier,
        features: ['quick_help', 'study_plan', 'deep_study_mode', 'advanced_quiz', 'personalized_tutoring', 'unlimited_sessions', 'priority_support']
      } : null);
      return true;
      
      // TODO: Uncomment when backend endpoints are ready
      // const result = await subscriptionAPI.upgrade({ tier });
      // if (result.success) {
      //   await refreshSubscription();
      //   return true;
      // }
      // return false;
    } catch (err) {
      console.error('Failed to upgrade subscription:', err);
      return false;
    }
  }, []);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      // For now, simulate cancellation since backend endpoints are not ready
      setSubscription(prev => prev ? {
        ...prev,
        status: 'cancelled'
      } : null);
      return true;
      
      // TODO: Uncomment when backend endpoints are ready
      // const result = await subscriptionAPI.cancel();
      // if (result.success) {
      //   await refreshSubscription();
      //   return true;
      // }
      // return false;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      return false;
    }
  }, []);

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
