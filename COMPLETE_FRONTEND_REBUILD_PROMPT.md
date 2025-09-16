# 🚀 COMPLETE FRONTEND REBUILD PROMPT
## Praxis AI - JEE Prep AI Tutor Frontend

### 📋 PROJECT OVERVIEW
Build a complete React-based frontend for an AI-powered JEE preparation platform with user management, usage tracking, and comprehensive study features. This is a sophisticated educational platform with free/premium tiers, real-time AI tutoring, and interactive study tools.

---

## 🎯 CORE REQUIREMENTS

### **Technology Stack**
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: React hooks (useState, useEffect, useCallback, useMemo)
- **Routing**: React Router DOM
- **HTTP Client**: Fetch API with custom wrapper
- **Authentication**: Google OAuth integration
- **Backend Integration**: RESTful API calls to Supabase + custom backend

### **Design System**
- **Theme**: Dark mode with academic/professional aesthetic
- **Color Palette**: 
  - Primary: Blue gradients (#3B82F6 to #1D4ED8)
  - Secondary: Purple gradients (#8B5CF6 to #7C3AED)
  - Success: Green (#10B981)
  - Warning: Orange (#F59E0B)
  - Error: Red (#EF4444)
  - Background: Dark slate (#0F172A, #1E293B)
- **Typography**: Inter font family
- **Components**: Shadcn/ui component library
- **Icons**: Lucide React icons

---

## 🏗️ APPLICATION ARCHITECTURE

### **1. ROUTING STRUCTURE**
```
/ (Protected) - Main Dashboard
├── /pricing (Public) - Pricing page
├── /subscription (Protected) - User subscription management
└── /* (Fallback) - 404 page
```

### **2. AUTHENTICATION FLOW**
- **Google OAuth** integration with custom backend
- **JWT token** management
- **Protected routes** with authentication guards
- **User session** persistence in localStorage
- **Automatic logout** on token expiration

### **3. USER MANAGEMENT SYSTEM**
- **Two user types**: Free and Premium
- **Free users**: 5 uses per day, resets 24h after last use
- **Premium users**: Unlimited access with Pro badge
- **Usage tracking**: Real-time usage monitoring
- **Trial sessions**: 5 trial sessions for Pro features

---

## 📱 COMPONENT STRUCTURE

### **1. MAIN PAGES**

#### **App.tsx** - Root Component
```typescript
// Features:
- Authentication state management
- Route protection
- Global error handling
- Loading states
- Toast notifications
- Analytics integration
```

#### **Index.tsx** - Main Dashboard
```typescript
// Features:
- Header with user info and usage display
- Tabbed interface (Syllabus/Deep Study)
- Left sidebar with syllabus explorer
- Main content area with content viewer
- Feature request form
- Responsive layout
```

#### **Pricing.tsx** - Pricing Page
```typescript
// Features:
- Premium pricing plans (₹99/month)
- Feature comparison table
- Upgrade buttons
- FAQ section
- Academic-themed design
```

#### **NotFound.tsx** - 404 Page
```typescript
// Features:
- Error logging
- Navigation back to home
- User-friendly error message
```

### **2. CORE COMPONENTS**

#### **SyllabusExplorer.tsx** - Left Sidebar
```typescript
// Features:
- Three-level navigation (Subject → Chapter → Topic)
- API integration with fallback to local data
- Loading states and error handling
- Real-time syllabus updates
- Responsive design
- Search functionality
```

#### **ContentViewer.tsx** - Main Content Area
```typescript
// Features:
- Mode selection (Practice/Revise)
- Content generation from API
- Quiz component integration
- Markdown rendering
- Source attribution
- Usage tracking integration
```

#### **AgenticStudyMode.tsx** - Deep Study Interface
```typescript
// Features:
- AI-powered study sessions
- Real-time chat interface
- Session management
- Progress tracking
- Study plan generation
- Image upload for problem solving
- Usage tracking and limits
```

#### **QuizComponent.tsx** - Interactive Quizzes
```typescript
// Features:
- Multiple choice questions
- Answer selection and validation
- Explanation display
- Progress tracking
- Next question navigation
- Usage tracking
```

#### **StudyPlanChat.tsx** - AI Study Planner
```typescript
// Features:
- Conversational AI interface
- Study plan generation
- Goal setting
- Progress tracking
- Chat history
- Usage tracking
```

### **3. USER MANAGEMENT COMPONENTS**

#### **UsageProgressDisplay.tsx** - Usage Status
```typescript
// Features:
- Progress bar for free users
- Pro badge for premium users
- Usage count display (3 of 5 used)
- Reset time information
- Upgrade prompts
- Responsive design
```

#### **FeatureUsageTracker.tsx** - Feature Gating
```typescript
// Features:
- Usage limit enforcement
- Blur overlay when limit reached
- Upgrade modal display
- Trial session management
- Feature access control
```

#### **GoogleLogin.tsx** - Authentication
```typescript
// Features:
- Google OAuth integration
- Token validation
- User data management
- Error handling
- Loading states
```

### **4. UI COMPONENTS**

#### **FeatureRequestForm.tsx** - Feedback System
```typescript
// Features:
- Feature suggestion form
- Rate limiting
- Success/error states
- Email auto-attachment
- API integration
```

#### **MarkdownRenderer.tsx** - Content Display
```typescript
// Features:
- Math equation rendering (KaTeX)
- Code syntax highlighting
- Image support
- Link handling
- Custom styling
```

#### **ImageUpload.tsx** - File Upload
```typescript
// Features:
- Drag and drop interface
- Image preview
- File validation
- Base64 conversion
- API integration
```

---

## 🔧 CUSTOM HOOKS

### **1. useAuth.ts** - Authentication Management
```typescript
// State:
- isAuthenticated: boolean
- user: User | null
- isLoading: boolean

// Functions:
- login(userData): void
- logout(): void
- checkAuthStatus(): void
```

### **2. useUsageTracking.ts** - Usage Management
```typescript
// State:
- usageStatus: UsageStatus | null
- loading: boolean
- error: string | null

// Functions:
- trackUsage(featureName, sessionId?): Promise<boolean>
- checkUsageLimit(): Promise<boolean>
- refreshUsageStatus(): Promise<void>
```

### **3. useTrialMode.ts** - Trial Session Management
```typescript
// State:
- userFeatures: UserFeatures | null
- trialSessionsRemaining: number
- subscriptionStatus: 'FREE' | 'PRO'
- hasProAccess: boolean
- isLoadingTrial: boolean
- showProModal: boolean
- showTrialModal: boolean

// Functions:
- checkUserFeatures(userId): Promise<UserFeatures | null>
- useTrialSession(userId, featureName): Promise<TrialUsageResponse | null>
- handleFeatureAccess(featureName): Promise<boolean>
```

### **4. useDeepStudySession.ts** - Study Session Management
```typescript
// State:
- currentSession: StudySession | null
- messages: ChatMessage[]
- isLoading: boolean
- error: string | null

// Functions:
- startSession(subject, chapter, topic): Promise<void>
- sendMessage(message): Promise<void>
- solveProblem(problem, imageData?): Promise<void>
- createQuiz(difficulty?, questionCount?): Promise<void>
- endSession(): void
```

---

## 🌐 API INTEGRATION

### **1. Backend API Endpoints**
```typescript
// Base URL: https://praxis-ai.fly.dev

// Authentication
POST /api/google-login
GET /api/syllabus

// Content Generation
POST /api/generate-content
POST /ask-question
POST /image-solve
POST /problem-solver
POST /chat

// Agentic Study
POST /agentic/session/start
POST /agentic/session/chat
POST /agentic/session/solve
POST /agentic/session/quiz

// Study Planning
POST /agentic/plan/generate
POST /agentic/chat/study-plan

// Subscription Management
GET /agentic/subscription/{user_id}
POST /agentic/subscription/trial/use
GET /agentic/subscription/features/{user_id}
```

### **2. Supabase Integration**
```typescript
// Tables:
- users (email as primary key)
- daily_usage (usage tracking)
- feature_usage_logs (analytics)
- trial_sessions (trial management)
- subscription_features (feature definitions)

// Functions:
- api_get_user_features(user_id)
- api_use_trial_session(user_id, feature)
- api_track_usage(user_id, feature_name)
- api_get_usage_status(user_id)
```

---

## 📊 DATA MODELS

### **1. User Interface**
```typescript
interface User {
  user_id: string;
  email: string;
  name: string;
  subscription_status?: 'FREE' | 'PRO';
  is_premium?: boolean;
}
```

### **2. Usage Tracking**
```typescript
interface UsageStatus {
  userType: 'free' | 'premium';
  usageCount: number;
  usageLimit: number;
  canUseFeature: boolean;
  lastUsedAt: string | null;
  resetTime: string | null;
  isPremium: boolean;
}
```

### **3. Syllabus Structure**
```typescript
interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  name: string;
  class: 11 | 12;
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
  content: {
    learn: string;
    revise: string;
  };
}
```

### **4. Study Session**
```typescript
interface StudySession {
  session_id: string;
  subject: string;
  chapter: string;
  topic?: string;
  session_type: 'deep_study' | 'quick_review';
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  last_activity: string;
}
```

---

## 🎨 DESIGN SPECIFICATIONS

### **1. Layout Structure**
```
┌─────────────────────────────────────────────────────────┐
│ Header (Logo, Usage Display, User Info, Logout)        │
├─────────────┬───────────────────────────────────────────┤
│ Left Sidebar│ Main Content Area                         │
│ (Syllabus)  │ ┌─────────────────────────────────────┐   │
│             │ │ Tab Navigation (Syllabus/Deep Study)│   │
│             │ ├─────────────────────────────────────┤   │
│             │ │ Content Viewer / Study Mode         │   │
│             │ │                                     │   │
│             │ └─────────────────────────────────────┘   │
└─────────────┴───────────────────────────────────────────┘
```

### **2. Responsive Breakpoints**
- **Mobile**: < 768px (stacked layout)
- **Tablet**: 768px - 1024px (collapsible sidebar)
- **Desktop**: > 1024px (full layout)

### **3. Component Styling**
- **Cards**: Rounded corners, subtle shadows, gradient borders
- **Buttons**: Gradient backgrounds, hover effects, loading states
- **Modals**: Backdrop blur, slide animations, responsive sizing
- **Forms**: Clean inputs, validation states, error messages
- **Progress**: Animated bars, color-coded states

---

## 🔐 SECURITY & PERFORMANCE

### **1. Security Features**
- **JWT token** validation
- **CORS** configuration
- **Input sanitization**
- **Rate limiting** on API calls
- **Secure storage** of user data

### **2. Performance Optimizations**
- **Code splitting** with React.lazy
- **Memoization** with useMemo/useCallback
- **Image optimization**
- **API response caching**
- **Bundle size optimization**

### **3. Error Handling**
- **Global error boundary**
- **API error handling**
- **User-friendly error messages**
- **Fallback UI components**
- **Error logging**

---

## 📱 MOBILE RESPONSIVENESS

### **1. Mobile Navigation**
- **Hamburger menu** for sidebar
- **Bottom navigation** for main features
- **Touch-friendly** button sizes
- **Swipe gestures** for navigation

### **2. Mobile Layout**
- **Stacked components** on small screens
- **Collapsible sections**
- **Optimized typography**
- **Touch-optimized** interactions

---

## 🧪 TESTING REQUIREMENTS

### **1. Unit Tests**
- **Component rendering**
- **Hook functionality**
- **API integration**
- **User interactions**

### **2. Integration Tests**
- **Authentication flow**
- **Usage tracking**
- **Feature gating**
- **API responses**

### **3. E2E Tests**
- **Complete user journeys**
- **Cross-browser compatibility**
- **Mobile responsiveness**
- **Performance testing**

---

## 🚀 DEPLOYMENT SPECIFICATIONS

### **1. Build Configuration**
- **Vite** as build tool
- **TypeScript** compilation
- **Tailwind CSS** purging
- **Asset optimization**

### **2. Environment Variables**
```env
VITE_API_BASE_URL=https://praxis-ai.fly.dev
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### **3. Deployment Checklist**
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Authentication working
- [ ] Usage tracking functional
- [ ] Mobile responsive
- [ ] Performance optimized
- [ ] Error handling complete

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Foundation**
- [ ] Project setup with Vite + React + TypeScript
- [ ] Tailwind CSS + Shadcn/ui configuration
- [ ] Routing setup with React Router
- [ ] Authentication system
- [ ] Basic layout structure

### **Phase 2: Core Features**
- [ ] Syllabus explorer component
- [ ] Content viewer with modes
- [ ] Quiz component
- [ ] Deep study mode
- [ ] Study plan chat

### **Phase 3: User Management**
- [ ] Usage tracking system
- [ ] Trial session management
- [ ] Feature gating
- [ ] Premium user detection
- [ ] Usage progress display

### **Phase 4: API Integration**
- [ ] Backend API integration
- [ ] Supabase integration
- [ ] Error handling
- [ ] Loading states
- [ ] Data persistence

### **Phase 5: Polish & Deploy**
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Testing
- [ ] Error boundaries
- [ ] Deployment

---

## 🎯 SUCCESS CRITERIA

### **Functional Requirements**
- ✅ Complete user authentication flow
- ✅ Syllabus navigation and content display
- ✅ AI-powered study sessions
- ✅ Usage tracking and limits
- ✅ Free/Premium user differentiation
- ✅ Mobile responsive design
- ✅ Real-time API integration

### **Performance Requirements**
- ✅ Page load time < 3 seconds
- ✅ API response time < 2 seconds
- ✅ Mobile performance score > 90
- ✅ Bundle size < 1MB gzipped

### **User Experience Requirements**
- ✅ Intuitive navigation
- ✅ Clear usage indicators
- ✅ Smooth animations
- ✅ Accessible design
- ✅ Error-free operation

---

## 🔄 MIGRATION NOTES

### **From Current Frontend**
- **Preserve all existing functionality**
- **Maintain API compatibility**
- **Keep user data structure**
- **Preserve authentication flow**
- **Maintain usage tracking logic**

### **New Design Implementation**
- **Modern UI/UX patterns**
- **Improved mobile experience**
- **Enhanced accessibility**
- **Better performance**
- **Cleaner code architecture**

---

This comprehensive prompt covers every aspect of the current frontend application. The new frontend should maintain 100% feature parity while implementing a modern, scalable architecture with improved user experience and performance.
