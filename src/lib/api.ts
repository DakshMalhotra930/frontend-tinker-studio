// API service layer for Deep Study Mode backend integration

const API_BASE_URL = 'https://praxis-ai.fly.dev/agentic';

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

export interface ProblemSolveResponse {
  session_id: string;
  solution: string;
  step: number;
  hint_level: number;
  timestamp: string;
}

export interface QuizQuestion {
  question: string;
  options: { [key: string]: string };
  correct_answer: string;
  explanation: string;
}

export interface QuizResponse {
  session_id: string;
  questions: QuizQuestion[];
  difficulty: string;
  question_count: number;
  timestamp: string;
}

export interface StudyPlanResponse {
  plan_id: string;
  subjects: string[];
  duration_days: number;
  goals: string[];
  daily_tasks: any[];
  created_at: string;
  progress: any;
}

export interface CreditStatus {
  user_id: string;
  credits_remaining: number;
  credits_limit: number;
  credits_date: string;
  is_pro_user: boolean;
}

// Subscription Types
export enum SubscriptionStatus {
  FREE = 'FREE',
  PRO = 'PRO',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO_MONTHLY = 'PRO_MONTHLY',
  PRO_YEARLY = 'PRO_YEARLY',
  PRO_LIFETIME = 'PRO_LIFETIME'
}

export interface SubscriptionResponse {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  expires_at?: string;
  trial_sessions_used?: number;
  trial_sessions_limit?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PricingInfo {
  monthly_price: number;
  yearly_price: number;
  lifetime_price: number;
  currency: string;
  features: string[];
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
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    let errorDetails = null;

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
      errorDetails = errorData;
      console.error('API Error Details:', errorData);
    } catch (e) {
      // If error response is not JSON, use default message
      console.error('Failed to parse error response:', e);
    }

    console.error(`API Request failed: ${url}`, { status: response.status, errorMessage, errorDetails });
    throw new APIError(errorMessage, response.status, errorDetails);
  }

  return response.json();
}

// Session Management
export const sessionAPI = {
  // Start a new study session
  start: async (data: {
    subject: string;
    topic: string;
    mode: string;
    user_id: string;
  }): Promise<StudySession> => {
    return apiRequest<StudySession>('/session/start', {
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
    return apiRequest<ChatResponse>('/session/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Problem Solving
export const problemAPI = {
  // Get step-by-step problem solving assistance
  solve: async (data: {
    session_id: string;
    problem: string;
    step?: number;
    hint_level?: number;
  }): Promise<ProblemSolveResponse> => {
    return apiRequest<ProblemSolveResponse>('/session/solve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Quiz Generation
export const quizAPI = {
  // Generate an interactive quiz
  generate: async (data: {
    session_id: string;
    difficulty?: string;
    question_count?: number;
  }): Promise<QuizResponse> => {
    return apiRequest<QuizResponse>('/session/quiz', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Study Plan Generation
export const studyPlanAPI = {
  // Generate a personalized study plan
  generate: async (data: {
    user_id: string;
    subjects: string[];
    duration_days: number;
    goals: string[];
    current_level?: string;
  }): Promise<StudyPlanResponse> => {
    return apiRequest<StudyPlanResponse>('/plan/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Content Generation
export const contentAPI = {
  // Generate educational content for a topic using session-based approach
  generateContent: async (data: {
    topic: string;
    mode: string;
  }): Promise<any> => {
    try {
      console.log('Starting content generation for:', data);
      
      const userId = apiUtils.getUserId() || 'anonymous';
      console.log('Using user ID:', userId);
      
      // First, start a session for the topic
      console.log('Starting session...');
      const sessionData = await sessionAPI.start({
        subject: 'Chemistry', // You might want to make this dynamic
        topic: data.topic,
        mode: data.mode,
        user_id: userId
      });
      console.log('Session started:', sessionData);

      // Then send a chat message to get content
      console.log('Sending chat message...');
      const chatResponse = await sessionAPI.chat({
        session_id: sessionData.session_id,
        message: `Please provide ${data.mode} content for the topic: ${data.topic}`,
        context_hint: data.mode
      });
      console.log('Chat response received:', chatResponse);

      return {
        content: chatResponse.response,
        session_id: sessionData.session_id,
        source_name: 'AI Tutor',
        source_level: 'Generated'
      };
    } catch (error) {
      console.error('Content generation failed:', error);
      throw error;
    }
  },
};

// Credit Management
export const creditAPI = {
  // Get user's credit status
  getCreditStatus: async (userId: string): Promise<CreditStatus> => {
    return apiRequest<CreditStatus>(`/credits/status/${userId}`, {
      method: 'GET',
    });
  },

  // Consume a credit for a feature
  consumeCredit: async (data: {
    user_id: string;
    feature_name: string;
    session_id?: string;
  }): Promise<{ success: boolean; credits_remaining: number }> => {
    return apiRequest<{ success: boolean; credits_remaining: number }>('/credits/consume', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Pro Subscription Management
export const proSubscriptionAPI = {
  // Check if user has active pro subscription
  checkSubscription: async (userId: string): Promise<{ is_pro: boolean; expires_at?: string }> => {
    return apiRequest<{ is_pro: boolean; expires_at?: string }>(`/subscription/status/${userId}`, {
      method: 'GET',
    });
  },

  // Create a new pro subscription
  createSubscription: async (data: {
    user_id: string;
    plan_type: string;
    payment_method: string;
  }): Promise<{ success: boolean; subscription_id: string }> => {
    return apiRequest<{ success: boolean; subscription_id: string }>('/subscription/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Subscription Management
export const subscriptionAPI = {
  // Get user's subscription status
  getStatus: async (userId: string): Promise<SubscriptionResponse> => {
    return apiRequest<SubscriptionResponse>(`/subscription/status/${userId}`, {
      method: 'GET',
    });
  },

  // Get pricing information
  getPricing: async (): Promise<PricingInfo> => {
    return apiRequest<PricingInfo>('/subscription/pricing', {
      method: 'GET',
    });
  },

  // Use a trial session
  useTrial: async (data: {
    user_id: string;
    feature_name: string;
  }): Promise<{ success: boolean; sessions_remaining: number }> => {
    return apiRequest<{ success: boolean; sessions_remaining: number }>('/subscription/trial', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Upgrade subscription
  upgrade: async (data: {
    tier: SubscriptionTier;
    user_id?: string;
  }): Promise<{ success: boolean; subscription_id: string }> => {
    return apiRequest<{ success: boolean; subscription_id: string }>('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cancel subscription
  cancel: async (userId: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/subscription/cancel/${userId}`, {
      method: 'POST',
    });
  },
};

// Utility functions
export const apiUtils = {
  // Create a user ID (in a real app, this would come from authentication)
  createUserId: (): string => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Get user ID (for compatibility)
  getUserId: (): string | null => {
    // In a real app, this would get the user ID from authentication context
    // For now, we'll create a consistent user ID stored in localStorage
    let userId = localStorage.getItem('praxis_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('praxis_user_id', userId);
    }
    return userId;
  },

  // Format error messages for display
  formatError: (error: unknown): string => {
    if (error instanceof APIError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
};
