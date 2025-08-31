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
};
