// =====================================================
// SUPABASE API INTEGRATION FOR PRAXIS AI
// =====================================================
// This file shows how to integrate the Supabase backend
// with your frontend user management system

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// API FUNCTIONS FOR USER MANAGEMENT
// =====================================================

export class SupabaseUserAPI {
  // Get user features and subscription status
  static async getUserFeatures(userId: string) {
    try {
      const { data, error } = await supabase.rpc('api_get_user_features', {
        p_user_id: userId
      });

      if (error) throw error;

      return {
        user_id: data.user_id,
        features: data.features,
        subscription_status: data.subscription_status,
        trial_sessions_remaining: data.trial_sessions_remaining,
        has_pro_access: data.has_pro_access
      };
    } catch (error) {
      console.error('Error getting user features:', error);
      throw error;
    }
  }

  // Use a trial session for a feature
  static async useTrialSession(userId: string, feature: string) {
    try {
      const { data, error } = await supabase.rpc('api_use_trial_session', {
        p_user_id: userId,
        p_feature: feature
      });

      if (error) throw error;

      return {
        success: data.success,
        message: data.message,
        trial_sessions_remaining: data.trial_sessions_remaining,
        sessions_remaining: data.sessions_remaining,
        feature: data.feature,
        upgrade_required: data.upgrade_required
      };
    } catch (error) {
      console.error('Error using trial session:', error);
      throw error;
    }
  }

  // Track feature usage
  static async trackUsage(userId: string, featureName: string, sessionId?: string, metadata?: any) {
    try {
      const { data, error } = await supabase.rpc('api_track_usage', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_session_id: sessionId || null,
        p_metadata: metadata || null
      });

      if (error) throw error;

      return {
        success: data.success,
        message: data.message
      };
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  // Get usage status
  static async getUsageStatus(userId: string) {
    try {
      const { data, error } = await supabase.rpc('api_get_usage_status', {
        p_user_id: userId
      });

      if (error) throw error;

      return {
        userType: data.userType,
        usageCount: data.usageCount,
        usageLimit: data.usageLimit,
        canUseFeature: data.canUseFeature,
        lastUsedAt: data.lastUsedAt,
        resetTime: data.resetTime,
        isPremium: data.isPremium
      };
    } catch (error) {
      console.error('Error getting usage status:', error);
      throw error;
    }
  }

  // Create or update user
  static async upsertUser(userData: {
    user_id: string;
    email: string;
    name: string;
    subscription_status?: 'FREE' | 'PRO';
    is_premium?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          user_id: userData.user_id,
          email: userData.email,
          name: userData.name,
          subscription_status: userData.subscription_status || 'FREE',
          is_premium: userData.is_premium || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  // Check if user is premium by email
  static async isPremiumUser(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_premium_user', {
        user_email: email
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }
}

// =====================================================
// UPDATED API.TS INTEGRATION
// =====================================================
// Replace your existing API functions with these Supabase calls

export const updatedAPI = {
  // Check user features (replaces trialAPI.checkUserFeatures)
  checkUserFeatures: async (userId: string) => {
    return await SupabaseUserAPI.getUserFeatures(userId);
  },

  // Use trial session (replaces trialAPI.useTrialSession)
  useTrialSession: async (data: { user_id: string; feature: string }) => {
    return await SupabaseUserAPI.useTrialSession(data.user_id, data.feature);
  },

  // Track usage (replaces usageAPI.trackUsage)
  trackUsage: async (data: { userId: string; featureName: string; sessionId?: string; metadata?: any }) => {
    return await SupabaseUserAPI.trackUsage(data.userId, data.featureName, data.sessionId, data.metadata);
  },

  // Get usage status (replaces usageAPI.getUsageStatus)
  getUsageStatus: async (userId: string) => {
    return await SupabaseUserAPI.getUsageStatus(userId);
  },

  // Check usage limit (replaces usageAPI.checkUsageLimit)
  checkUsageLimit: async (data: { userId: string; featureName: string }) => {
    const status = await SupabaseUserAPI.getUsageStatus(data.userId);
    return {
      canUse: status.canUseFeature,
      usageCount: status.usageCount,
      usageLimit: status.usageLimit
    };
  }
};

// =====================================================
// ENVIRONMENT VARIABLES NEEDED
// =====================================================
/*
Add these to your .env file:

VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

You can find these in your Supabase project settings under API.
*/

// =====================================================
// USAGE EXAMPLE
// =====================================================
/*
// In your React components:

import { SupabaseUserAPI } from './supabase_api_integration';

// Check if user is premium
const isPremium = await SupabaseUserAPI.isPremiumUser('dakshmalhotra930@gmail.com');

// Get user features
const features = await SupabaseUserAPI.getUserFeatures('user123');

// Track usage
const result = await SupabaseUserAPI.trackUsage('user123', 'deep_study_mode', 'session456');

// Use trial session
const trialResult = await SupabaseUserAPI.useTrialSession('user123', 'deep_study_mode');
*/
