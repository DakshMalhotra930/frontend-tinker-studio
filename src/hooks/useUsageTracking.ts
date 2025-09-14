import { useState, useEffect, useCallback } from 'react';
import { apiUtils } from '../lib/api';

export interface UsageStatus {
  userType: 'free' | 'premium';
  usageCount: number;
  usageLimit: number;
  canUseFeature: boolean;
  lastUsedAt: string | null;
  resetTime: string | null;
  isPremium: boolean;
}

interface UseUsageTrackingReturn {
  usageStatus: UsageStatus | null;
  loading: boolean;
  error: string | null;
  trackUsage: (featureName: string, sessionId?: string) => Promise<boolean>;
  checkUsageLimit: () => Promise<boolean>;
  refreshUsageStatus: () => Promise<void>;
}

const PREMIUM_EMAIL = 'dakshmalhotra930@gmail.com';
const FREE_USER_LIMIT = 5;

export const useUsageTracking = (): UseUsageTrackingReturn => {
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is premium based on email
  const isPremiumUser = useCallback((email: string): boolean => {
    return email === PREMIUM_EMAIL;
  }, []);

  // Get user email from auth context
  const getUserEmail = useCallback((): string | null => {
    try {
      const userData = localStorage.getItem('praxis_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email;
      }
    } catch (error) {
      console.error('Failed to get user email:', error);
    }
    return null;
  }, []);

  // Calculate reset time (24 hours from last use)
  const calculateResetTime = useCallback((lastUsedAt: string): string => {
    const lastUsed = new Date(lastUsedAt);
    const resetTime = new Date(lastUsed.getTime() + 24 * 60 * 60 * 1000);
    return resetTime.toISOString();
  }, []);

  // Check if usage should be reset (24 hours passed)
  const shouldResetUsage = useCallback((lastUsedAt: string | null): boolean => {
    if (!lastUsedAt) return true;
    const lastUsed = new Date(lastUsedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24;
  }, []);

  // Load usage status
  const loadUsageStatus = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const userEmail = getUserEmail();
      if (!userEmail) {
        setLoading(false);
        return;
      }

      const isPremium = isPremiumUser(userEmail);
      
      // For premium users, return unlimited access
      if (isPremium) {
        setUsageStatus({
          userType: 'premium',
          usageCount: 0,
          usageLimit: -1, // Unlimited
          canUseFeature: true,
          lastUsedAt: null,
          resetTime: null,
          isPremium: true
        });
        setLoading(false);
        return;
      }

      // For free users, check usage from localStorage
      const usageKey = `usage_${userEmail}`;
      const storedUsage = localStorage.getItem(usageKey);
      
      if (storedUsage) {
        const usage = JSON.parse(storedUsage);
        const shouldReset = shouldResetUsage(usage.lastUsedAt);
        
        if (shouldReset) {
          // Reset usage
          const resetUsage = {
            count: 0,
            lastUsedAt: null,
            resetTime: null
          };
          localStorage.setItem(usageKey, JSON.stringify(resetUsage));
          
          setUsageStatus({
            userType: 'free',
            usageCount: 0,
            usageLimit: FREE_USER_LIMIT,
            canUseFeature: true,
            lastUsedAt: null,
            resetTime: null,
            isPremium: false
          });
        } else {
          // Use stored usage
          setUsageStatus({
            userType: 'free',
            usageCount: usage.count,
            usageLimit: FREE_USER_LIMIT,
            canUseFeature: usage.count < FREE_USER_LIMIT,
            lastUsedAt: usage.lastUsedAt,
            resetTime: usage.resetTime,
            isPremium: false
          });
        }
      } else {
        // First time user
        setUsageStatus({
          userType: 'free',
          usageCount: 0,
          usageLimit: FREE_USER_LIMIT,
          canUseFeature: true,
          lastUsedAt: null,
          resetTime: null,
          isPremium: false
        });
      }
    } catch (err) {
      console.error('Failed to load usage status:', err);
      setError('Failed to load usage status');
    } finally {
      setLoading(false);
    }
  }, [getUserEmail, isPremiumUser, shouldResetUsage]);

  // Track usage for a feature
  const trackUsage = useCallback(async (featureName: string, sessionId?: string): Promise<boolean> => {
    try {
      const userEmail = getUserEmail();
      if (!userEmail) {
        console.error('No user email found');
        return false;
      }

      const isPremium = isPremiumUser(userEmail);
      
      // Premium users don't need tracking
      if (isPremium) {
        return true;
      }

      // Check if user can use feature
      if (!usageStatus?.canUseFeature) {
        return false;
      }

      // Update usage count
      const usageKey = `usage_${userEmail}`;
      const currentUsage = {
        count: (usageStatus?.usageCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      localStorage.setItem(usageKey, JSON.stringify(currentUsage));

      // Update state
      setUsageStatus(prev => prev ? {
        ...prev,
        usageCount: currentUsage.count,
        canUseFeature: currentUsage.count < FREE_USER_LIMIT,
        lastUsedAt: currentUsage.lastUsedAt,
        resetTime: currentUsage.resetTime
      } : null);

      console.log(`Usage tracked for ${featureName}: ${currentUsage.count}/${FREE_USER_LIMIT}`);
      return true;
    } catch (err) {
      console.error('Failed to track usage:', err);
      return false;
    }
  }, [getUserEmail, isPremiumUser, usageStatus]);

  // Check if user can use a feature
  const checkUsageLimit = useCallback(async (): Promise<boolean> => {
    if (!usageStatus) return false;
    return usageStatus.canUseFeature;
  }, [usageStatus]);

  // Refresh usage status
  const refreshUsageStatus = useCallback(async (): Promise<void> => {
    await loadUsageStatus();
  }, [loadUsageStatus]);

  // Load usage status on mount
  useEffect(() => {
    loadUsageStatus();
  }, [loadUsageStatus]);

  return {
    usageStatus,
    loading,
    error,
    trackUsage,
    checkUsageLimit,
    refreshUsageStatus
  };
};
