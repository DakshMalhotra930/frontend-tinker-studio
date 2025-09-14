import { useState, useEffect, useCallback } from 'react';
import { apiUtils, trialAPI } from '../lib/api';

export interface UserFeatures {
  user_id: string;
  features: string[];
  subscription_status: 'FREE' | 'PRO';
  trial_sessions_remaining: number;
  has_pro_access: boolean;
}

export interface TrialUsageResponse {
  success: boolean;
  message: string;
  trial_sessions_remaining: number;
  sessions_remaining: number;
  feature: string;
  upgrade_required: boolean;
}

export interface UserSubscription {
  user_id: string;
  subscription_status: 'FREE' | 'PRO';
  tier: 'FREE' | 'PRO';
  trial_sessions_remaining: number;
  has_pro_access: boolean;
}

interface UseTrialModeReturn {
  // State variables
  userFeatures: UserFeatures | null;
  trialSessionsRemaining: number;
  subscriptionStatus: 'FREE' | 'PRO';
  hasProAccess: boolean;
  isLoadingTrial: boolean;
  showProModal: boolean;
  showTrialModal: boolean;
  lockedFeature: string | null;
  trialMessage: string | null;
  
  // API functions
  checkUserFeatures: (userId: string) => Promise<UserFeatures | null>;
  useTrialSession: (userId: string, featureName: string) => Promise<TrialUsageResponse | null>;
  getUserSubscription: (userId: string) => Promise<UserSubscription | null>;
  
  // Feature gating functions
  isFeatureAvailable: (featureName: string) => { available: boolean; requiresTrial: boolean };
  handleFeatureAccess: (featureName: string) => Promise<boolean>;
  
  // UI control functions
  setShowProModal: (show: boolean) => void;
  setShowTrialModal: (show: boolean) => void;
  setLockedFeature: (feature: string | null) => void;
  setTrialMessage: (message: string | null) => void;
  
  // Utility functions
  refreshTrialStatus: () => Promise<void>;
  initializeUser: () => Promise<void>;
}

// Free features that don't require gating
const FREE_FEATURES = [
  'Quick Help',
  'Study Plan Generation',
  'Syllabus Questions',
  'Problem Solver',
  'Image Solve',
  'Advanced Quiz',
  'syllabus',
  'generate_content',
  'ask_question',
  'problem_solver',
  'chat',
  'image_solve',
  'study_plan'
];

// Pro features that require Pro access or trial
const PRO_FEATURES = [
  'Deep Study Mode',
  'Personalized Tutoring',
  'Unlimited Sessions',
  'Priority Support',
  'deep_study_mode',
  'advanced_quiz'
];

export const useTrialMode = (): UseTrialModeReturn => {
  // State variables
  const [userFeatures, setUserFeatures] = useState<UserFeatures | null>(null);
  const [trialSessionsRemaining, setTrialSessionsRemaining] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'FREE' | 'PRO'>('FREE');
  const [hasProAccess, setHasProAccess] = useState(false);
  const [isLoadingTrial, setIsLoadingTrial] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);
  const [trialMessage, setTrialMessage] = useState<string | null>(null);

  // Check user features
  const checkUserFeatures = useCallback(async (userId: string): Promise<UserFeatures | null> => {
    try {
      const data = await trialAPI.checkUserFeatures(userId);
      
      // Update state
      setUserFeatures(data);
      setTrialSessionsRemaining(data.trial_sessions_remaining);
      setSubscriptionStatus(data.subscription_status);
      setHasProAccess(data.has_pro_access);
      
      console.log('User features loaded:', data);
      return data;
    } catch (error) {
      console.error('Failed to check user features:', error);
      
      // Set default free user values when API fails
      const defaultFreeUser: UserFeatures = {
        user_id: userId,
        features: ['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve', 'study_plan'],
        subscription_status: 'FREE',
        trial_sessions_remaining: 10,
        has_pro_access: false
      };
      
      setUserFeatures(defaultFreeUser);
      setTrialSessionsRemaining(10);
      setSubscriptionStatus('FREE');
      setHasProAccess(false);
      
      return defaultFreeUser;
    }
  }, []);

  // Use trial session
  const useTrialSession = useCallback(async (userId: string, featureName: string): Promise<TrialUsageResponse | null> => {
    try {
      setIsLoadingTrial(true);
      
      const data = await trialAPI.useTrialSession({
        user_id: userId,
        feature: featureName
      });
      
      // Update trial count
      setTrialSessionsRemaining(data.trial_sessions_remaining);
      
      // Update user features if available
      if (userFeatures) {
        setUserFeatures(prev => prev ? {
          ...prev,
          trial_sessions_remaining: data.trial_sessions_remaining
        } : null);
      }
      
      console.log('Trial session used:', data);
      return data;
    } catch (error) {
      console.error('Failed to use trial session:', error);
      return null;
    } finally {
      setIsLoadingTrial(false);
    }
  }, [userFeatures]);

  // Get user subscription
  const getUserSubscription = useCallback(async (userId: string): Promise<UserSubscription | null> => {
    try {
      const data = await trialAPI.getUserSubscription(userId);
      
      // Update state
      setSubscriptionStatus(data.subscription_status);
      setHasProAccess(data.has_pro_access);
      setTrialSessionsRemaining(data.trial_sessions_remaining);
      
      console.log('User subscription loaded:', data);
      return data;
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      return null;
    }
  }, []);

  // Check if feature is available
  const isFeatureAvailable = useCallback((featureName: string): { available: boolean; requiresTrial: boolean } => {
    // Check if it's a free feature
    if (FREE_FEATURES.includes(featureName)) {
      return { available: true, requiresTrial: false };
    }
    
    // Check if it's a pro feature
    if (PRO_FEATURES.includes(featureName)) {
      // Check if user is premium by email
      const userEmail = apiUtils.getUserId() ? 
        JSON.parse(localStorage.getItem('praxis_user') || '{}').email : null;
      const isPremiumByEmail = userEmail === 'dakshmalhotra930@gmail.com';
      
      // If user has pro access or is premium by email, no trial needed
      if (hasProAccess || isPremiumByEmail) {
        return { available: true, requiresTrial: false };
      }
      
      // If user has trials available, can use trial
      if (trialSessionsRemaining > 0) {
        return { available: true, requiresTrial: true };
      }
      
      // No access and no trials
      return { available: false, requiresTrial: false };
    }
    
    // Unknown feature, assume free
    return { available: true, requiresTrial: false };
  }, [hasProAccess, trialSessionsRemaining]);

  // Handle feature access
  const handleFeatureAccess = useCallback(async (featureName: string): Promise<boolean> => {
    const userId = apiUtils.getUserId();
    if (!userId) {
      console.error('No user ID found');
      return false;
    }

    const { available, requiresTrial } = isFeatureAvailable(featureName);
    
    if (!available) {
      // Show pro lock modal
      setLockedFeature(featureName);
      setShowProModal(true);
      return false;
    }
    
    if (requiresTrial) {
      // Use trial session
      const result = await useTrialSession(userId, featureName);
      if (result?.success) {
        setTrialMessage(`Trial session used for ${featureName}. ${result.trial_sessions_remaining} trials remaining.`);
        setShowTrialModal(true);
        return true;
      } else {
        console.error('Failed to use trial session');
        return false;
      }
    }
    
    // Direct access
    return true;
  }, [isFeatureAvailable, useTrialSession]);

  // Refresh trial status
  const refreshTrialStatus = useCallback(async (): Promise<void> => {
    const userId = apiUtils.getUserId();
    if (userId) {
      await checkUserFeatures(userId);
    }
  }, [checkUserFeatures]);

  // Initialize user data
  const initializeUser = useCallback(async (): Promise<void> => {
    const userId = apiUtils.getUserId();
    if (userId) {
      await checkUserFeatures(userId);
    }
  }, [checkUserFeatures]);

  // Initialize on mount
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  return {
    // State variables
    userFeatures,
    trialSessionsRemaining,
    subscriptionStatus,
    hasProAccess,
    isLoadingTrial,
    showProModal,
    showTrialModal,
    lockedFeature,
    trialMessage,
    
    // API functions
    checkUserFeatures,
    useTrialSession,
    getUserSubscription,
    
    // Feature gating functions
    isFeatureAvailable,
    handleFeatureAccess,
    
    // UI control functions
    setShowProModal,
    setShowTrialModal,
    setLockedFeature,
    setTrialMessage,
    
    // Utility functions
    refreshTrialStatus,
    initializeUser
  };
};
