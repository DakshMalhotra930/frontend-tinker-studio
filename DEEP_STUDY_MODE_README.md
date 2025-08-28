# PraxisAI Deep Study Mode Frontend Integration

This document describes the Deep Study Mode frontend components that integrate with your `agentic.py` backend at https://github.com/DakshMalhotra930/ai-tutor.

## 🎯 Overview

The Deep Study Mode provides AI-powered interactive study sessions with three main features:
1. **AI Chat** - Natural language Q&A with your study topics
2. **Problem Solver** - Submit text problems and images for step-by-step solutions
3. **Study Plans** - Generate personalized study plans for subjects/topics

## 🏗️ Architecture

### Core Components

- **`AgenticStudyMode.tsx`** - Main Deep Study Mode panel with tabbed interface
- **`AgenticSidebar.tsx`** - Quick AI Help sidebar accessible anywhere in the app
- **`useDeepStudySession.ts`** - Custom React hook for session management
- **`api.ts`** - API service layer for backend integration
- **`ImageUpload.tsx`** - Component for handling image uploads in problem solving

### API Integration

All components integrate with your `agentic.py` backend endpoints:

```
Base URL: https://praxis-ai.fly.dev/agentic

Endpoints:
├── /session/start     - Initialize study session
├── /session/chat      - Send/receive chat messages
├── /session/solve     - Submit problems for solutions
├── /plan/generate     - Create personalized study plans
├── /session/quiz      - Generate interactive quizzes
└── /quick-help        - Get instant AI assistance
```

## 🚀 Quick Start

### 1. Demo Page

Use the `DeepStudyDemo.tsx` page to test the integration:

```tsx
import DeepStudyDemo from '@/pages/DeepStudyDemo';

// This provides a complete demo with mock navigation
// and full Deep Study Mode functionality
```

### 2. Integration in Existing App

Add the Deep Study Mode to your existing content viewer:

```tsx
import { AgenticStudyMode } from '@/components/AgenticStudyMode';

// In your content viewer component
{selectedMode === 'deep-study' && (
  <AgenticStudyMode 
    subject={selectedSubject.name} 
    topic={selectedTopic.name} 
  />
)}
```

### 3. Quick AI Help Sidebar

Add the floating help button anywhere in your app:

```tsx
import { AgenticSidebar } from '@/components/AgenticSidebar';

// This adds a floating button that opens the AI help sidebar
<AgenticSidebar />
```

## 📱 Component Details

### AgenticStudyMode

The main Deep Study Mode component with four tabs:

- **AI Chat**: Real-time chat interface with AI tutor
- **Problem Solver**: Submit problems with optional image uploads
- **Study Plans**: View and create personalized study plans
- **Quiz**: Generate and take interactive quizzes

**Props:**
```tsx
interface AgenticStudyModeProps {
  subject: string | null;  // Selected subject name
  topic: string | null;    // Selected topic name
}
```

### AgenticSidebar

Floating quick help sidebar accessible from anywhere:

- Fixed position button (bottom-right)
- Slide-in sidebar with chat interface
- Instant AI responses to any question
- Message history and error handling

### useDeepStudySession Hook

Custom React hook managing all Deep Study Mode state:

```tsx
const {
  // State
  currentSession,
  chatMessages,
  studyPlans,
  quizQuestions,
  isLoading,
  error,
  
  // Actions
  sendMessage,
  solveProblem,
  generateQuiz,
  createStudyPlan,
  clearError,
} = useDeepStudySession({ subject, topic });
```

## 🔧 Configuration

### Environment Variables

Ensure your backend URL is correctly configured in `src/lib/api.ts`:

```typescript
const API_BASE_URL = 'https://praxis-ai.fly.dev/agentic';
```

### UI Components

The integration uses your existing shadcn/ui components:
- `Button`, `Input`, `Textarea`, `Card`
- `Tabs`, `ScrollArea`, `Badge`
- All styling follows your existing design system

## 📊 Data Flow

### 1. Session Initialization
```
User selects topic → Hook calls /session/start → Session created → Welcome message displayed
```

### 2. AI Chat
```
User types message → Hook calls /session/chat → AI response received → Message added to chat
```

### 3. Problem Solving
```
User submits problem → Hook calls /session/solve → Solution received → Step-by-step display
```

### 4. Study Plans
```
User clicks "Create Plan" → Hook calls /plan/generate → Plan created → Added to plans list
```

## 🎨 UI/UX Features

- **Dark theme** matching your production deployment
- **Loading states** with spinners and progress indicators
- **Error handling** with dismissible error messages
- **Responsive design** that works on all screen sizes
- **Smooth animations** for tab switching and sidebar
- **Chat bubbles** with timestamps and user/AI distinction
- **Status badges** for study plan states
- **Image preview** for uploaded problem images

## 🧪 Testing

### Build Test
```bash
npm run build
```

### Development
```bash
npm run dev
```

### Demo Page
Navigate to the demo page to test all functionality with mock data.

## 🔗 Backend Integration

The frontend expects these response formats from your `agentic.py`:

### Session Start
```json
{
  "session_id": "uuid",
  "subject": "Chemistry",
  "topic": "Atomic Structure",
  "mode": "explain",
  "created_at": "2024-01-01T00:00:00Z",
  "welcome_message": "Welcome to Deep Study Mode!"
}
```

### Chat Response
```json
{
  "session_id": "uuid",
  "response": "AI response text",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Problem Solution
```json
{
  "session_id": "uuid",
  "solution": "Step-by-step solution text",
  "step": 1,
  "hint_level": 3,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🚨 Error Handling

The integration includes comprehensive error handling:

- **API errors** are caught and displayed to users
- **Network failures** show appropriate error messages
- **Validation errors** prevent invalid submissions
- **Loading states** prevent duplicate requests
- **Error dismissal** allows users to continue

## 📝 Notes

- **No authentication required** - Uses generated user IDs for demo
- **Image uploads** support JPG, PNG, GIF up to 5MB
- **Session persistence** - Sessions are maintained during component lifecycle
- **Responsive design** - Works on mobile and desktop
- **Accessibility** - Keyboard navigation and screen reader support

## 🎯 Next Steps

1. **Test the demo page** to verify all functionality
2. **Integrate into your main app** by adding the components
3. **Customize styling** to match your exact design requirements
4. **Add authentication** by modifying the user ID generation
5. **Test with real backend** to ensure API compatibility

The Deep Study Mode is now fully integrated and ready to provide AI-powered study assistance to your users!
