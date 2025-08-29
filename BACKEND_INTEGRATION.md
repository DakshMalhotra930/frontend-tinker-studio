# Backend Integration Guide

## Overview
This guide explains how to connect the frontend to your [ai-tutor backend](https://github.com/DakshMalhotra930/ai-tutor/tree/main/backend).

## Current API Configuration

The frontend is now configured to work with standard backend patterns. Here are the current API endpoints:

### Base URL Configuration
- **Local Development**: `http://localhost:8000`
- **Production**: Your actual backend deployment URL
- **Previous**: `https://praxis-ai.fly.dev/agentic` (as fallback)

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

### Step 1: Create Environment File
Create a `.env` file in your project root:

```bash
# Copy from .env.example
cp .env.example .env
```

### Step 2: Configure Backend URL
Edit the `.env` file and set your backend URL:

```env
# For local development
VITE_API_BASE_URL=http://localhost:8000

# For production (update with your actual backend URL)
# VITE_API_BASE_URL=https://your-backend-domain.com
```

### Step 3: Update Backend Routes
Make sure your Python backend has these routes:

```python
# Example FastAPI routes
@app.post("/api/session/start")
async def start_session(data: dict):
    # Your session start logic
    pass

@app.post("/api/session/chat")
async def chat(data: dict):
    # Your chat logic
    pass

@app.post("/api/plan/generate")
async def generate_plan(data: dict):
    # Your plan generation logic
    pass

@app.post("/api/quick-help")
async def quick_help(data: dict):
    # Your quick help logic
    pass

@app.post("/api/generate-content")
async def generate_content(data: dict):
    # Your content generation logic
    pass
```

### Step 4: Test Connection
1. Start your backend server
2. Start the frontend: `npm run dev`
3. Check browser console for any connection errors
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

### Common Issues

1. **CORS Errors**: Ensure your backend allows requests from your frontend domain
2. **404 Errors**: Check that your backend routes match the frontend API calls
3. **Connection Refused**: Verify your backend server is running and accessible

### Debug Steps

1. Check browser Network tab for failed requests
2. Verify backend server is running on the correct port
3. Test API endpoints with tools like Postman or curl
4. Check backend logs for any errors

## Next Steps

1. **Deploy Backend**: Deploy your ai-tutor backend to a hosting service
2. **Update Environment**: Set the production backend URL in your environment
3. **Test Integration**: Verify all features work with the live backend
4. **Monitor**: Watch for any API errors or performance issues

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your backend routes match the frontend expectations
3. Ensure your backend is properly handling the request/response formats
4. Test individual API endpoints independently

The frontend is now ready to connect to your ai-tutor backend! 🚀
