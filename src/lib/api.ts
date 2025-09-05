// API service layer for AI Tutor backend integration
// Connect to your ai-tutor backend: https://github.com/DakshMalhotra930/ai-tutor/tree/main/backend

// Set your Fly.io backend URL in .env file
// Example: VITE_API_BASE_URL=https://praxis-ai.fly.dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
export interface SubscriptionStatus {
  status: 'free' | 'pro' | 'trial' | 'expired' | 'cancelled';
  tier: 'free' | 'pro_monthly' | 'pro_yearly' | 'pro_lifetime';
  trial_sessions_used_today: number;
  trial_sessions_limit_daily: number;
  last_trial_reset_date: string;
  expires_at?: string;
  features: string[];
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
  feature: string;
  session_id?: string;
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

// Session Management - Using /agentic/ prefix
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
    return apiRequest<StudySession>('/agentic/session/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Send a chat message
  chat: async (data: {
    session_id: string;
    message: string;
    context_hint?: string;
  }): Promise<ChatResponse> => {
    return apiRequest<ChatResponse>('/agentic/session/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Solve a problem using dedicated endpoint
  solve: async (data: {
    session_id: string;
    problem: string;
    step?: number;
    hint_level?: number;
  }): Promise<any> => {
    return apiRequest<any>('/agentic/session/solve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Study Plan Generation - Using /agentic/ prefix
export const studyPlanAPI = {
  // Generate a personalized study plan (legacy form-based)
  generate: async (data: {
    user_id: string;
    subjects: string[];
    duration_days: number;
    goals: string[];
    current_level?: string;
  }): Promise<StudyPlanResponse> => {
    return apiRequest<StudyPlanResponse>('/agentic/plan/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Generate study plan from natural language chat
  generateFromChat: async (data: {
    message: string;
    user_id?: string;
    currentDateTime?: string;
  }): Promise<StudyPlanResponse> => {
    return apiRequest<StudyPlanResponse>('/agentic/chat/study-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Quick Help - Using /agentic/ prefix (as shown in backend docs)
export const quickHelpAPI = {
  // Get quick AI help
  getHelp: async (data: {
    query: string;
    context?: string;
  }): Promise<QuickHelpResponse> => {
    return apiRequest<QuickHelpResponse>('/agentic/quick-help', {
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

// Subscription Management - Using /api/ prefix
export const subscriptionAPI = {
  // Get current subscription status
  getStatus: async (): Promise<SubscriptionStatus> => {
    return apiRequest<SubscriptionStatus>('/api/subscription/status', {
      method: 'GET',
    });
  },

  // Upgrade subscription
  upgrade: async (data: UpgradeRequest): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cancel subscription
  cancel: async (): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/subscription/cancel', {
      method: 'POST',
    });
  },

  // Use trial session
  useTrial: async (data: TrialUsageRequest): Promise<{ success: boolean; message: string; trial_sessions_remaining: number }> => {
    return apiRequest<{ success: boolean; message: string; trial_sessions_remaining: number }>('/agentic/subscription/trial/use', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get available features for current subscription
  getFeatures: async (): Promise<{ features: string[] }> => {
    return apiRequest<{ features: string[] }>('/api/subscription/features', {
      method: 'GET',
    });
  },

  // Get pricing information
  getPricing: async (): Promise<PricingInfo> => {
    return apiRequest<PricingInfo>('/api/subscription/pricing', {
      method: 'GET',
    });
  },
};

// Utility functions
export const apiUtils = {
  // Create a user ID (in a real app, this would come from authentication)
  createUserId: (): string => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
