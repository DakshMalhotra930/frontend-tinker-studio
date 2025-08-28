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
      errorMessage = errorData.detail || errorMessage;
      errorDetails = errorData;
    } catch {
      // If error response is not JSON, use default message
    }

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

// Quick Help
export const quickHelpAPI = {
  // Get quick AI help
  getHelp: async (data: {
    query: string;
    context?: string;
  }): Promise<QuickHelpResponse> => {
    return apiRequest<QuickHelpResponse>('/quick-help', {
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
    return 'An unexpected error occurred';
  },
};
