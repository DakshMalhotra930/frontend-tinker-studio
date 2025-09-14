// API service layer for AI Tutor backend integration
// Connect to your ai-tutor backend: https://github.com/DakshMalhotra930/ai-tutor/tree/main/backend

// Set your Fly.io backend URL in .env file
// Example: VITE_API_BASE_URL=https://praxis-ai.fly.dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://praxis-ai.fly.dev';
const AGENTIC_BASE_URL = `${API_BASE_URL}/agentic`;

if (!API_BASE_URL) {
  console.error('VITE_API_BASE_URL is not set. Please set your Fly.io backend URL in .env file');
}

export interface StudySession {
  session_id: string;
  subject: string;
  topic: string;
  mode: string;
  created_at: string;
  welcome_message?: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  timestamp: string;
}

export interface StudyPlanResponse {
  plan_id?: string;
  response?: string; // The full text response containing the study plan
  plan?: any; // Structured plan object with details
  subjects?: string[];
  duration_days?: number;
  goals?: string[];
  daily_tasks?: any[];
  created_at?: string;
  progress?: any;
  needs_more_info?: boolean; // Boolean telling if more info is needed
  motivation?: string; // Short motivational message
}

export interface QuickHelpResponse {
  response: string;
  timestamp: string;
}

// Subscription Management Interfaces
export enum SubscriptionStatus {
  FREE = 'free',
  PRO = 'pro',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum SubscriptionTier {
  FREE = 'free',
  PRO_MONTHLY = 'pro_monthly',
  PRO_YEARLY = 'pro_yearly',
  PRO_LIFETIME = 'pro_lifetime'
}

export interface SubscriptionResponse {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  trial_sessions_used: number;
  trial_sessions_limit: number;
  trial_reset_date: string;
  expires_at?: string;
  features: string[];
  user_id: string;
}

export interface PricingInfo {
  monthly: {
    price: number;
    currency: string;
    features: string[];
  };
  yearly: {
    price: number;
    currency: string;
    features: string[];
    discount: string;
  };
  lifetime: {
    price: number;
    currency: string;
    features: string[];
  };
}

export interface UpgradeRequest {
  tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime';
  payment_method?: string;
}

export interface TrialUsageRequest {
  user_id: string;
  feature: string;
}

// API Error class
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Generic API request function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new APIError('Backend URL not configured. Please set VITE_API_BASE_URL in .env file', 0);
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Log the request details for debugging
  console.log(`Making API request to: ${url}`);
  if (options.body) {
    console.log('Request body:', options.body);
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        errorDetails = errorData;
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 0);
  }
}

// Session Management - Pro-Protected Endpoints
export const sessionAPI = {
  // Start a new study session
  start: async (data: {
    subject: string;
    topic: string;
    mode: string;
    user_id: string;
    exam_type?: string;
    current_level?: string;
    study_hours?: number;
  }): Promise<StudySession> => {
    return apiRequest<StudySession>(`/agentic/session/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Send a chat message (Pro-Protected)
  chat: async (data: {
    session_id: string;
    message: string;
    context_hint?: string;
  }): Promise<ChatResponse> => {
    return apiRequest<ChatResponse>(`/agentic/session/chat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Solve a problem using dedicated endpoint (Pro-Protected)
  solve: async (data: {
    session_id: string;
    problem: string;
    step?: number;
    hint_level?: number;
  }): Promise<any> => {
    return apiRequest<any>(`/agentic/session/solve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Study Plan Generation - Pro-Protected Endpoints
export const studyPlanAPI = {
  // Generate a personalized study plan (legacy form-based)
  generate: async (data: {
    user_id: string;
    subjects: string[];
    duration_days: number;
    goals: string[];
    current_level?: string;
  }): Promise<StudyPlanResponse> => {
    return apiRequest<StudyPlanResponse>(`/agentic/plan/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Generate study plan from natural language chat (Pro-Protected)
  generateFromChat: async (data: {
    message: string;
    user_id?: string;
    currentDateTime?: string;
  }): Promise<StudyPlanResponse> => {
    return apiRequest<StudyPlanResponse>(`/agentic/chat/study-plan`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Free Endpoints (no Pro access required)
export const freeAPI = {
  // Get syllabus data (FREE)
  getSyllabus: async (): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/api/syllabus`, {
      method: 'GET',
    });
  },

  // Generate content/questions (FREE)
  generateContent: async (data: {
    topic: string;
    mode: string;
  }): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/api/generate-content`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Ask questions (FREE)
  askQuestion: async (data: {
    question: string;
    context?: string;
  }): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/ask-question`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Problem solver (FREE)
  solveProblem: async (data: {
    problem: string;
    subject?: string;
  }): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/problem-solver`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Casual chat (FREE)
  chat: async (data: {
    message: string;
    context?: string;
  }): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/chat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Image solving (FREE)
  solveImage: async (data: {
    image_url: string;
    question?: string;
  }): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/image-solve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Base64 image solving (FREE)
  solveImageBase64: async (data: {
    image_base64: string;
    question?: string;
  }): Promise<any> => {
    return apiRequest<any>(`${API_BASE_URL}/image-solve-base64`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Quick Help API - Free endpoint
export const quickHelpAPI = {
  // Get quick AI help (FREE)
  getHelp: async (data: {
    query: string;
    context?: string;
  }): Promise<QuickHelpResponse> => {
    return apiRequest<QuickHelpResponse>(`${API_BASE_URL}/ask-question`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Content Generation - Using /api/ prefix (as shown in docs)
export const contentAPI = {
  // Generate content for different modes (Learn, Revise, Practice)
  generateContent: async (data: {
    topic: string;
    mode: string;
  }): Promise<any> => {
    return apiRequest<any>('/api/generate-content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Google Login - Using /api/ prefix (as shown in docs)
export const authAPI = {
  // Google login
  googleLogin: async (data: any): Promise<any> => {
    return apiRequest<any>('/api/google-login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Subscription Management API
export const subscriptionAPI = {
  // Get user subscription status
  getStatus: async (userId: string): Promise<SubscriptionResponse> => {
    return apiRequest<SubscriptionResponse>(`/agentic/subscription/${userId}`, {
      method: 'GET',
    });
  },

  // Upgrade subscription
  upgrade: async (data: UpgradeRequest): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/agentic/subscription/upgrade`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cancel subscription
  cancel: async (userId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/agentic/subscription/cancel/${userId}`, {
      method: 'POST',
    });
  },

  // Use trial session
  useTrial: async (data: TrialUsageRequest): Promise<{ success: boolean; message: string; trial_sessions_remaining: number }> => {
    return apiRequest<{ success: boolean; message: string; trial_sessions_remaining: number }>(`/agentic/subscription/trial/use`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get available features for current subscription
  getFeatures: async (userId: string): Promise<{ features: string[] }> => {
    return apiRequest<{ features: string[] }>(`/agentic/subscription/features/${userId}`, {
      method: 'GET',
    });
  },

  // Get pricing information
  getPricing: async (): Promise<PricingInfo> => {
    return apiRequest<PricingInfo>(`/agentic/subscription/pricing`, {
      method: 'GET',
    });
  },
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    try {
      const storedUser = localStorage.getItem('praxis_user');
      if (!storedUser) return false;
      const userData = JSON.parse(storedUser);
      return !!(userData && userData.user_id);
    } catch {
      return false;
    }
  },

  // Get user ID from localStorage (throws error if not found)
  getUserId: (): string => {
    try {
      const storedUser = localStorage.getItem('praxis_user');
      if (!storedUser) {
        throw new APIError('User not authenticated. Please log in.', 401);
      }
      const userData = JSON.parse(storedUser);
      if (!userData.user_id) {
        throw new APIError('Invalid user data. Please log in again.', 401);
      }
      return userData.user_id;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Failed to get user ID:', error);
      throw new APIError('Authentication required. Please log in.', 401);
    }
  },

  // Get user data from localStorage
  getUserData: (): { user_id: string; email: string; name: string } | null => {
    try {
      const storedUser = localStorage.getItem('praxis_user');
      if (!storedUser) return null;
      const userData = JSON.parse(storedUser);
      if (!userData.user_id || !userData.email || !userData.name) return null;
      return userData;
    } catch {
      return null;
    }
  },

  // Format error messages for display
  formatError: (error: unknown): string => {
    if (error instanceof APIError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      // Handle [object Object] case
      try {
        return JSON.stringify(error);
      } catch {
        return 'An unexpected error occurred';
      }
    }
    return 'An unexpected error occurred';
  },

  // Get the current API base URL
  getApiBaseUrl: (): string => {
    return API_BASE_URL || 'Not configured';
  },

  // Check if error is a Pro access error
  isProAccessError: (error: unknown): boolean => {
    return error instanceof APIError && error.status === 403;
  },

  // Get Pro access error details
  getProAccessError: (error: unknown): { message: string; upgradePrompt?: string } | null => {
    if (!apiUtils.isProAccessError(error)) return null;
    
    const apiError = error as APIError;
    const message = apiError.message.toLowerCase();
    
    if (message.includes('trial') && message.includes('limit')) {
      return {
        message: 'Daily trial limit reached',
        upgradePrompt: 'Daily trial limit reached. Try again tomorrow! Upgrade to Pro for unlimited access.',
      };
    }
    
    if (message.includes('pro') || message.includes('subscription') || message.includes('upgrade')) {
      return {
        message: 'Pro feature access required',
        upgradePrompt: 'This feature requires a Pro subscription. Upgrade now to unlock all features.',
      };
    }
    
    return {
      message: 'Access denied',
      upgradePrompt: 'This feature requires Pro access. Upgrade to continue.',
    };
  },
};

// Usage Tracking API
export const usageAPI = {
  // Track feature usage
  trackUsage: async (data: {
    userId: string;
    featureName: string;
    sessionId?: string;
    metadata?: any;
  }): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/usage/track', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get usage status for user
  getUsageStatus: async (userId: string): Promise<{
    userType: 'free' | 'premium';
    usageCount: number;
    usageLimit: number;
    canUseFeature: boolean;
    lastUsedAt: string | null;
    resetTime: string | null;
  }> => {
    return apiRequest<{
      userType: 'free' | 'premium';
      usageCount: number;
      usageLimit: number;
      canUseFeature: boolean;
      lastUsedAt: string | null;
      resetTime: string | null;
    }>(`/api/usage/status/${userId}`);
  },

  // Check if user can use a feature
  checkUsageLimit: async (data: {
    userId: string;
    featureName: string;
  }): Promise<{ canUse: boolean; usageCount: number; usageLimit: number }> => {
    return apiRequest<{ canUse: boolean; usageCount: number; usageLimit: number }>('/api/usage/check-limit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset usage for user (admin function)
  resetUsage: async (userId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/api/usage/reset/${userId}`, {
      method: 'POST',
    });
  },
};

// Trial Mode API
export const trialAPI = {
  // Check user features
  checkUserFeatures: async (userId: string): Promise<{
    user_id: string;
    features: string[];
    subscription_status: 'FREE' | 'PRO';
    trial_sessions_remaining: number;
    has_pro_access: boolean;
  }> => {
    return apiRequest<{
      user_id: string;
      features: string[];
      subscription_status: 'FREE' | 'PRO';
      trial_sessions_remaining: number;
      has_pro_access: boolean;
    }>(`/agentic/subscription/features/${userId}`);
  },

  // Use trial session
  useTrialSession: async (data: {
    user_id: string;
    feature: string;
  }): Promise<{
    success: boolean;
    message: string;
    trial_sessions_remaining: number;
    sessions_remaining: number;
    feature: string;
    upgrade_required: boolean;
  }> => {
    return apiRequest<{
      success: boolean;
      message: string;
      trial_sessions_remaining: number;
      sessions_remaining: number;
      feature: string;
      upgrade_required: boolean;
    }>('/agentic/subscription/trial/use', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get user subscription
  getUserSubscription: async (userId: string): Promise<{
    user_id: string;
    subscription_status: 'FREE' | 'PRO';
    tier: 'FREE' | 'PRO';
    trial_sessions_remaining: number;
    has_pro_access: boolean;
  }> => {
    return apiRequest<{
      user_id: string;
      subscription_status: 'FREE' | 'PRO';
      tier: 'FREE' | 'PRO';
      trial_sessions_remaining: number;
      has_pro_access: boolean;
    }>(`/agentic/subscription/${userId}`);
  },
};
