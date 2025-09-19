import { useState, useEffect, useCallback } from 'react';
import { 
  sessionAPI, 
  problemAPI, 
  quizAPI, 
  studyPlanAPI, 
  apiUtils,
  type StudySession,
  type QuizQuestion,
  type APIError
} from '@/lib/api';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  metadata?: any;
}

interface StudyPlan {
  id: string;
  title: string;
  description: string;
  duration: string;
  topics: string[];
  created: Date;
  status: 'active' | 'completed' | 'paused';
}

interface UseDeepStudySessionProps {
  subject: string | null;
  topic: string | null;
}

export function useDeepStudySession({ subject, topic }: UseDeepStudySessionProps) {
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [studyPlanMessages, setStudyPlanMessages] = useState<ChatMessage[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [error, setError] = useState('');

  // Initialize session when component mounts or when subject/topic changes
  useEffect(() => {
    initializeSession();
  }, [subject, topic]);

  const initializeSession = useCallback(async () => {
    // Initialize session even without specific subject/topic for general study
    const sessionSubject = subject || 'General Study';
    const sessionTopic = topic || 'AI Deep Study Mode';

    try {
      setError('');
      setIsLoading(true);
      const data = await sessionAPI.start({
        subject: sessionSubject,
        topic: sessionTopic,
        mode: 'explain',
        user_id: apiUtils.createUserId(),
      });
      
      setCurrentSession(data);
      
      // Add welcome message to chat
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        text: data.welcome_message || 'Welcome to Deep Study Mode!',
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages([welcomeMessage]);

      // Add study plan specific welcome message
      const studyPlanWelcomeMessage: ChatMessage = {
        id: 'study-plan-welcome',
        text: `Welcome to Study Plan Chat! I'm your dedicated study planning assistant for JEE preparation. I can help you:

📚 **Create personalized study schedules** based on your exam timeline
🎯 **Set realistic goals** and track your progress
📖 **Organize subjects** and prioritize topics effectively
⏰ **Plan daily/weekly study sessions** with proper time allocation
📊 **Analyze your strengths and weaknesses** to focus on areas that need improvement
🔄 **Adapt plans** as you progress and master different topics

**How to get started:**
- Tell me your exam date and current preparation level
- Share which subjects you want to focus on
- Let me know your daily study time availability
- I'll create a customized study plan just for you!

What's your exam timeline and current preparation status?`,
        isUser: false,
        timestamp: new Date(),
      };
      setStudyPlanMessages([studyPlanWelcomeMessage]);
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setError(apiUtils.formatError(err));
    } finally {
      setIsLoading(false);
    }
  }, [subject, topic]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError('');

    try {
      const data = await sessionAPI.chat({
        session_id: currentSession.session_id,
        message,
      });
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(apiUtils.formatError(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const sendStudyPlanMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setStudyPlanMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError('');

    try {
      // Use the same chat API but with study plan context
      const studyPlanMessage = `[STUDY PLAN REQUEST] ${message}`;
      const data = await sessionAPI.chat({
        session_id: currentSession.session_id,
        message: studyPlanMessage,
      });
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };
      setStudyPlanMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('Failed to send study plan message:', err);
      setError(apiUtils.formatError(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const solveProblem = useCallback(async (problem: string) => {
    if (!problem.trim() || !currentSession) return;

    const problemMessage: ChatMessage = {
      id: Date.now().toString(),
      text: `Please help me solve this problem: ${problem}`,
      isUser: true,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, problemMessage]);
    setIsLoading(true);
    setError('');

    try {
      const data = await problemAPI.solve({
        session_id: currentSession.session_id,
        problem,
        step: 1,
        hint_level: 3, // Full solution
      });
      
      const solutionMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.solution,
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, solutionMessage]);
    } catch (err) {
      console.error('Failed to solve problem:', err);
      setError(apiUtils.formatError(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const generateQuiz = useCallback(async () => {
    if (!currentSession) return;

    try {
      setError('');
      setIsGeneratingQuiz(true);
      const data = await quizAPI.generate({
        session_id: currentSession.session_id,
        difficulty: 'medium',
        question_count: 5,
      });
      setQuizQuestions(data.questions);
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      setError(apiUtils.formatError(err));
    } finally {
      setIsGeneratingQuiz(false);
    }
  }, [currentSession]);

  const createStudyPlan = useCallback(async () => {
    if (!subject) return;

    try {
      setError('');
      const data = await studyPlanAPI.generate({
        user_id: apiUtils.createUserId(),
        subjects: [subject],
        duration_days: 7,
        goals: [`Master ${topic || 'selected topics'}`],
        current_level: 'intermediate',
      });
      
      const newPlan: StudyPlan = {
        id: data.plan_id,
        title: `Study Plan for ${subject}`,
        description: `Personalized plan covering ${data.subjects.join(', ')}`,
        duration: `${data.duration_days} days`,
        topics: data.daily_tasks.map((task: any) => task.topics).flat(),
        created: new Date(data.created_at),
        status: 'active',
      };

      setStudyPlans(prev => [...prev, newPlan]);
    } catch (err) {
      console.error('Failed to create study plan:', err);
      setError(apiUtils.formatError(err));
    }
  }, [subject, topic]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const resetQuiz = useCallback(() => {
    setQuizQuestions([]);
  }, []);

  return {
    // State
    currentSession,
    chatMessages,
    studyPlanMessages,
    studyPlans,
    quizQuestions,
    isLoading,
    isGeneratingQuiz,
    error,
    
    // Actions
    sendMessage,
    sendStudyPlanMessage,
    solveProblem,
    generateQuiz,
    createStudyPlan,
    clearError,
    resetQuiz,
    initializeSession,
  };
}
