# AI Tutor Backend Integration Guide

## Overview
This guide explains how to connect the frontend to your [ai-tutor backend](https://github.com/DakshMalhotra930/ai-tutor/tree/main/backend).

## Current Issue & Solution

**Problem**: The frontend was still trying to connect to the old backend (`praxis-ai.fly.dev`) instead of your ai-tutor backend.

**Solution**: Updated API configuration to properly connect to your ai-tutor backend and created environment configuration.

## Current API Configuration

The frontend is now configured to work with your ai-tutor backend. Here are the current API endpoints:

### Base URL Configuration
- **Local Development**: `http://localhost:8000` (default)
- **Production**: Your actual ai-tutor backend deployment URL
- **Environment Variable**: `VITE_API_BASE_URL`

### API Endpoints

#### 1. Session Management
- **Start Session**: `POST /api/session/start`
- **Chat**: `POST /api/session/chat`

#### 2. Study Plans
- **Generate Plan**: `POST /api/plan/generate`

#### 3. Quick Help
- **Get Help**: `POST /api/quick-help`

#### 4. Content Generation
- **Generate Content**: `POST /api/generate-content`

## Setup Instructions

### Step 1: Environment Configuration ✅ COMPLETED
The `.env` file has been created with:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Step 2: Start Your AI Tutor Backend
1. Navigate to your [ai-tutor backend](https://github.com/DakshMalhotra930/ai-tutor/tree/main/backend)
2. Start your Python backend server (typically on port 8000)
3. Ensure it's accessible at `http://localhost:8000`

### Step 3: Update Backend Routes
Make sure your ai-tutor backend has these routes:

```python
# Example FastAPI routes for ai-tutor backend
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class SessionStartRequest(BaseModel):
    subject: str
    topic: str
    mode: str
    user_id: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context_hint: str = None

class StudyPlanRequest(BaseModel):
    user_id: str
    subjects: list[str]
    duration_days: int
    goals: list[str]
    current_level: str = None

class QuickHelpRequest(BaseModel):
    query: str
    context: str = None

class ContentRequest(BaseModel):
    topic: str
    mode: str

@app.post("/api/session/start")
async def start_session(data: SessionStartRequest):
    # Your session start logic
    return {
        "session_id": "session_123",
        "subject": data.subject,
        "topic": data.topic,
        "mode": data.mode,
        "created_at": "2025-01-29T10:00:00Z",
        "welcome_message": "Welcome to your study session!"
    }

@app.post("/api/session/chat")
async def chat(data: ChatRequest):
    # Your chat logic
    return {
        "session_id": data.session_id,
        "response": "I'm here to help you with your studies!",
        "timestamp": "2025-01-29T10:00:00Z"
    }

@app.post("/api/plan/generate")
async def generate_plan(data: StudyPlanRequest):
    # Your plan generation logic
    return {
        "plan_id": "plan_123",
        "subjects": data.subjects,
        "duration_days": data.duration_days,
        "goals": data.goals,
        "daily_tasks": [],
        "created_at": "2025-01-29T10:00:00Z",
        "progress": {}
    }

@app.post("/api/quick-help")
async def quick_help(data: QuickHelpRequest):
    # Your quick help logic
    return {
        "response": "Here's quick help for your question!",
        "timestamp": "2025-01-29T10:00:00Z"
    }

@app.post("/api/generate-content")
async def generate_content(data: ContentRequest):
    # Your content generation logic
    return {
        "content": f"Generated content for {data.topic} in {data.mode} mode",
        "source_name": "AI Tutor",
        "source_level": "Generated"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 4: Test Connection
1. Start your ai-tutor backend server
2. Start the frontend: `npm run dev`
3. Check browser console for connection logs
4. Test the Deep Study Mode functionality

## API Data Formats

### Session Start Request
```json
{
  "subject": "Chemistry",
  "topic": "Lewis Representation",
  "mode": "deep-study",
  "user_id": "user_123"
}
```

### Chat Request
```json
{
  "session_id": "session_456",
  "message": "Explain Lewis structures",
  "context_hint": "chemical bonding"
}
```

### Study Plan Request
```json
{
  "user_id": "user_123",
  "subjects": ["Chemistry", "Physics"],
  "duration_days": 30,
  "goals": ["Master JEE concepts", "Practice problems"],
  "current_level": "intermediate"
}
```

### Content Generation Request
```json
{
  "topic": "Lewis Representation",
  "mode": "learn"
}
```

## Troubleshooting

### Current Issue: Method Not Allowed (405)
**Symptoms**: 
- Console shows "Method Not Allowed" errors
- API calls to old backend URL

**Solution**: 
1. ✅ Frontend API configuration updated
2. ✅ Environment file created
3. 🔄 Start your ai-tutor backend server
4. 🔄 Ensure backend routes match frontend expectations

### Common Issues

1. **CORS Errors**: Ensure your ai-tutor backend allows requests from your frontend domain
2. **404 Errors**: Check that your backend routes match the frontend API calls exactly
3. **Connection Refused**: Verify your ai-tutor backend server is running on port 8000

### Debug Steps

1. Check browser console for the new log: "Making API request to: [URL]"
2. Verify your ai-tutor backend server is running and accessible
3. Test API endpoints with tools like Postman or curl
4. Check backend logs for any errors

## Next Steps

1. **Start Backend**: Start your ai-tutor backend server
2. **Test Integration**: Verify all features work with the live backend
3. **Deploy Backend**: Deploy your ai-tutor backend to production
4. **Update Environment**: Set the production backend URL in your environment

## Support

If you encounter issues:
1. Check the browser console for "Making API request to:" logs
2. Verify your ai-tutor backend routes match the frontend expectations
3. Ensure your backend is properly handling the request/response formats
4. Test individual API endpoints independently

The frontend is now properly configured to connect to your ai-tutor backend! 🚀

**Next Action**: Start your ai-tutor backend server and test the connection.
