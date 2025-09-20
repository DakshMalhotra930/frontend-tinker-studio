// API service layer for Deep Study Mode backend integration

const API_BASE_URL = 'https://praxis-ai.fly.dev';

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
  credits_used: number;
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
};

// Problem Solving
export const problemAPI = {
  // Get step-by-step problem solving assistance
  solve: async (data: {
    session_id: string;
    problem: string;
    step?: number;
    hint_level?: number;
    image_data?: string;
  }): Promise<ProblemSolveResponse> => {
    return apiRequest<ProblemSolveResponse>('/agentic/session/solve', {
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
    return apiRequest<QuizResponse>('/agentic/session/quiz', {
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
    return apiRequest<StudyPlanResponse>('/agentic/plan/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Content Generation
export const contentAPI = {
  // Generate educational content for a topic using direct API call
  generateContent: async (data: {
    topic: string;
    mode: string;
  }): Promise<any> => {
    try {
      console.log('Starting content generation for:', data);
      
      // Call the direct content generation endpoint
      const response = await apiRequest<any>('/api/generate-content', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('Content generation response:', response);
      return response;
    } catch (error) {
      console.error('Content generation failed:', error);
      throw error;
    }
  },
};

// Mock content generator for development
function generateMockContent(topic: string, mode: string): string {
  const contentTemplates = {
    learn: `# ${topic} - Learning Content

## Introduction
This topic covers the fundamental concepts of ${topic} in chemistry. Let's explore the key principles and their applications.

## Key Concepts
1. **Basic Principles**: Understanding the core concepts
2. **Applications**: Real-world applications and examples
3. **Practice Problems**: Work through examples to reinforce learning

## Study Tips
- Focus on understanding the underlying principles
- Practice with different types of problems
- Make connections to related topics

*This is demo content. The full AI-powered content generation will be available soon.*`,

    revise: `# ${topic} - Revision Guide

## Quick Review
Here's a concise summary of ${topic} for your revision:

### Key Points
- Essential concepts to remember
- Important formulas and equations
- Common problem-solving strategies

### Common Mistakes to Avoid
- Typical errors students make
- How to identify and correct them

### Practice Questions
- Quick self-assessment questions
- Solutions and explanations

*This is demo content. The full AI-powered content generation will be available soon.*`,

    practice: `# ${topic} - Practice Problems

## Problem Set
Here are some practice problems for ${topic}:

### Easy Level
1. Basic concept application
2. Simple calculations
3. Definition-based questions

### Medium Level
1. Multi-step problems
2. Concept integration
3. Analysis questions

### Hard Level
1. Complex problem-solving
2. Advanced applications
3. JEE-level questions

*This is demo content. The full AI-powered content generation will be available soon.*`
  };

  return contentTemplates[mode as keyof typeof contentTemplates] || contentTemplates.learn;
}

// Credit Management
export const creditAPI = {
  // Get user's credit status
  getCreditStatus: async (userId: string): Promise<CreditStatus> => {
    return apiRequest<CreditStatus>(`/api/credits/status/${userId}`, {
      method: 'GET',
    });
  },

  // Consume a credit for a feature
  consumeCredit: async (data: {
    user_id: string;
    feature_name: string;
    session_id?: string;
  }): Promise<{ success: boolean; credits_remaining: number }> => {
    return apiRequest<{ success: boolean; credits_remaining: number }>('/api/credits/consume', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Pro Subscription Management
export const proSubscriptionAPI = {
  // Check if user has active pro subscription
  checkSubscription: async (userId: string): Promise<{ is_pro: boolean; expires_at?: string }> => {
    return apiRequest<{ is_pro: boolean; expires_at?: string }>(`/api/subscription/${userId}`, {
      method: 'GET',
    });
  },

  // Create a new pro subscription
  createSubscription: async (data: {
    user_id: string;
    plan_type: string;
    payment_method: string;
  }): Promise<{ success: boolean; subscription_id: string }> => {
    return apiRequest<{ success: boolean; subscription_id: string }>('/api/payment/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Payment Management
export const paymentAPI = {
  // Create QR payment
  createQRPayment: async (data: {
    amount: number;
    currency: string;
    user_id: string;
    tier: string;
  }): Promise<{ 
    qr_code: string; 
    qr_image: string;
    payment_id: string;
    amount: number;
    tier: string;
    expires_at: string;
  }> => {
    return apiRequest<{ 
      qr_code: string; 
      qr_image: string;
      payment_id: string;
      amount: number;
      tier: string;
      expires_at: string;
    }>('/api/payment/qr/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify QR payment
  verifyQRPayment: async (data: {
    qr_code: string;
    user_id: string;
  }): Promise<{ success: boolean; status: string }> => {
    return apiRequest<{ success: boolean; status: string }>('/api/payment/qr/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Manual verification for UPI payments
  verifyManualPayment: async (qr_code: string, user_id: string): Promise<{
    success: boolean;
    message?: string;
    status?: string;
    tier?: string;
    amount?: number;
  }> => {
    return apiRequest<{
      success: boolean;
      message?: string;
      status?: string;
      tier?: string;
      amount?: number;
    }>(`/api/payment/qr/verify-manual?qr_code=${encodeURIComponent(qr_code)}&user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST',
    });
  },

  // Get QR payment status
  getQRPaymentStatus: async (qr_code: string): Promise<{ status: string; amount: number; tier: string }> => {
    return apiRequest<{ status: string; amount: number; tier: string }>(`/api/payment/qr/status/${qr_code}`, {
      method: 'GET',
    });
  },

  // Verify payment (legacy)
  verifyPayment: async (payment_id: string): Promise<{ success: boolean; status: string }> => {
    return apiRequest<{ success: boolean; status: string }>(`/api/payment/verify`, {
      method: 'POST',
      body: JSON.stringify({ payment_id }),
    });
  },
};

// Trial Management
export const trialAPI = {
  // Use trial session
  useTrial: async (data: {
    user_id: string;
    feature_name: string;
  }): Promise<{ success: boolean; sessions_remaining: number }> => {
    return apiRequest<{ success: boolean; sessions_remaining: number }>('/api/subscription/trial', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get trial status
  getTrialStatus: async (userId: string): Promise<{ 
    sessions_used: number; 
    sessions_limit: number; 
    is_trial_active: boolean 
  }> => {
    return apiRequest<{ sessions_used: number; sessions_limit: number; is_trial_active: boolean }>(`/api/subscription/trial/${userId}`, {
      method: 'GET',
    });
  },
};

// Subscription Management
export const subscriptionAPI = {
  // Get user's subscription status
  getStatus: async (userId: string): Promise<SubscriptionResponse> => {
    return apiRequest<SubscriptionResponse>(`/api/subscription/${userId}`, {
      method: 'GET',
    });
  },

  // Get pricing information
  getPricing: async (): Promise<PricingInfo> => {
    return apiRequest<PricingInfo>('/api/pricing', {
      method: 'GET',
    });
  },

  // Use a trial session
  useTrial: async (data: {
    user_id: string;
    feature_name: string;
  }): Promise<{ success: boolean; sessions_remaining: number }> => {
    return apiRequest<{ success: boolean; sessions_remaining: number }>('/api/subscription/trial', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Upgrade subscription
  upgrade: async (data: {
    tier: SubscriptionTier;
    user_id?: string;
  }): Promise<{ success: boolean; subscription_id: string }> => {
    return apiRequest<{ success: boolean; subscription_id: string }>('/api/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cancel subscription
  cancel: async (userId: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/api/subscription/cancel/${userId}`, {
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

  // Get user ID from the logged-in user data
  getUserId: (): string | null => {
    try {
      const userData = localStorage.getItem('praxis_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.user_id;
      }
    } catch (error) {
      console.error('Failed to get user ID from storage:', error);
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    try {
      const userData = localStorage.getItem('praxis_user');
      if (userData) {
        const user = JSON.parse(userData);
        return !!(user && user.user_id);
      }
    } catch (error) {
      console.error('Failed to check authentication status:', error);
    }
    return false;
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
