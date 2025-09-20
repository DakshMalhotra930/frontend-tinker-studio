"""
Multi-Topic JEE Deep Study Mode AI Tutoring Module for PraxisAI

This module implements advanced AI tutoring features including:
- Multi-turn conversational AI with context memory
- Support for any JEE subject or topic (Physics, Chemistry, Mathematics)
- Step-by-step explanations with JEE-level depth
- Problem solving assistance for JEE preparation
- Study planning and organization for JEE
- Session tracking and progress adaptation
- Rich markdown content with math formulas
- Long conversation context management
- JEE-specific tips and exam strategies

Author: PraxisAI Team
Version: 2.0.0 - Multi-Topic JEE Support
"""

import os
import json
import uuid
import asyncio
import traceback
import io
import base64
import qrcode
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from dataclasses import dataclass, asdict
import hashlib
import secrets
import random

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from together import Together
from PIL import Image
import google.generativeai as genai

from dotenv import load_dotenv

# Import database connection function
try:
    from main import get_db_connection
except ImportError:
    # Fallback if main.py import fails
    def get_db_connection():
        return None

# Credit checking function
async def check_and_consume_credit(user_id: str, feature_name: str, session_id: Optional[str] = None) -> tuple[bool, str, int]:
    """
    Check if user can consume a credit for a Pro feature
    Returns: (can_use, message, credits_remaining)
    """
    
    try:
        conn = get_db_connection()
        if not conn:
            return False, "Database connection unavailable", 0
        
        with conn.cursor() as cur:
            # Check if user is Pro subscriber
            cur.execute("""
                SELECT subscription_status FROM pro_subscriptions 
                WHERE user_id = %s AND subscription_status = 'pro'
            """, (user_id,))
            is_pro = cur.fetchone() is not None
            
            if is_pro:
                return True, "Pro user - unlimited access", 999
            
            # Check if feature requires Pro access
            cur.execute("""
                SELECT requires_pro, credits_required FROM pro_features 
                WHERE feature_name = %s
            """, (feature_name,))
            feature_info = cur.fetchone()
            
            if not feature_info or not feature_info[0]:
                return True, "Free feature - no credits required", 999
            
            # Get current credit status
            cur.execute("""
                SELECT credits_used, credits_limit FROM daily_credits 
                WHERE user_id = %s AND credits_date = CURRENT_DATE
            """, (user_id,))
            credit_info = cur.fetchone()
            
            if not credit_info:
                # Initialize credits for new user
                cur.execute("""
                    INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
                    VALUES (%s, 0, 5, CURRENT_DATE)
                """, (user_id,))
                conn.commit()
                credits_used, credits_limit = 0, 5
            else:
                credits_used, credits_limit = credit_info
            
            credits_required = feature_info[1]
            credits_remaining = credits_limit - credits_used
            
            if credits_remaining < credits_required:
                return False, f"Insufficient credits. You have {credits_remaining} credits remaining.", credits_remaining
            
            # Consume the credit
            cur.execute("""
                UPDATE daily_credits 
                SET credits_used = credits_used + %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND credits_date = CURRENT_DATE
            """, (credits_required, user_id))
            
            # Log the usage
            cur.execute("""
                INSERT INTO credit_usage_logs (user_id, feature_name, credits_consumed, session_id)
                VALUES (%s, %s, %s, %s)
            """, (user_id, feature_name, credits_required, session_id))
            
            conn.commit()
            new_credits_remaining = credits_remaining - credits_required
            
            return True, f"Credit consumed successfully. {new_credits_remaining} credits remaining.", new_credits_remaining
            
    except Exception as e:
        print(f"Error checking credits: {e}")
        return False, "Error checking credits", 0
    finally:
        if conn:
            conn.close()

# Load environment variables
script_dir = os.path.dirname(__file__)
dotenv_path = os.path.join(script_dir, '.env')
load_dotenv(dotenv_path=dotenv_path)

# Configuration
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
GOOGLE_GEMINI_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")

# Initialize AI clients
llm_client = Together(api_key=TOGETHER_API_KEY)

# Initialize Gemini client
if GOOGLE_GEMINI_API_KEY:
    genai.configure(api_key=GOOGLE_GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    print("✅ Gemini 1.5 Flash client initialized successfully")
else:
    gemini_model = None
    print("⚠️ Gemini API key not found - vision features disabled")

# Router instance
router = APIRouter()

# Constants
MAX_CONTEXT_LENGTH = 8000  # Maximum tokens for conversation context
MAX_SESSION_DURATION = 24  # Hours
# Model selection based on input type
DEFAULT_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"  # For text-only problems
VISION_MODEL = "gemini-1.5-flash"  # For image problems (Google Gemini 1.5 Flash)

# TutoringMode enum removed - no longer needed for multi-topic support

class MessageRole(str, Enum):
    """Message roles in conversation"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"

@dataclass
class ConversationMessage:
    """Represents a message in the tutoring conversation"""
    role: MessageRole
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class StudySession:
    """Represents an active study session"""
    session_id: str
    user_id: str
    # Removed subject, topic, and mode for multi-topic support
    messages: List[ConversationMessage]
    created_at: datetime
    last_activity: datetime
    progress_data: Dict[str, Any]
    context_summary: Optional[str] = None

@dataclass
class StudyPlan:
    """Represents a personalized study plan"""
    plan_id: str
    user_id: str
    subjects: List[str]
    exam_date: str
    exam_chapters: List[str]
    duration_days: int
    goals: List[str]
    daily_tasks: List[Dict[str, Any]]
    created_at: datetime
    progress: Dict[str, Any]

# Pydantic Models for API
class StartSessionRequest(BaseModel):
    """Request model for starting a new study session"""
    user_id: str = Field(..., description="User identifier")
    subject: str = Field(..., description="Subject to study")
    topic: str = Field(..., description="Topic or chapter to focus on")
    mode: str = Field(..., description="Study mode (explain, practice, review)")
    context_hint: Optional[str] = Field(None, description="Additional context")

class ChatMessageRequest(BaseModel):
    """Request model for sending a message in study session"""
    session_id: str = Field(..., description="Active session identifier")
    message: str = Field(..., description="User message")
    context_hint: Optional[str] = None
    image_data: Optional[str] = Field(None, description="Optional base64 encoded image data")

class ProblemSolveRequest(BaseModel):
    """Request model for problem solving assistance"""
    session_id: str = Field(..., description="Active session identifier")
    problem: str = Field(..., description="Problem statement")
    step: Optional[int] = Field(1, description="Current step in solving process")
    hint_level: Optional[int] = Field(1, description="Level of hint detail (1-3)")

class StudyPlanRequest(BaseModel):
    """Request model for generating study plans"""
    user_id: str = Field(..., description="User identifier")
    subjects: List[str] = Field(..., description="Subjects to include in plan")
    # Make new fields optional for backward compatibility
    exam_date: Optional[str] = Field(None, description="Exam date in YYYY-MM-DD format")
    exam_chapters: Optional[List[str]] = Field(None, description="Specific chapters that will appear in the exam")
    # Keep old field for backward compatibility
    duration_days: Optional[int] = Field(None, ge=1, le=30, description="Plan duration in days (legacy)")
    goals: List[str] = Field(..., description="Learning goals")
    current_level: str = Field("intermediate", description="Current proficiency level")
    study_hours_per_day: int = Field(default=6, description="Available study hours per day")
    include_practice: bool = Field(default=True, description="Include practice problems and mock tests")

class QuizRequest(BaseModel):
    """Request model for generating quizzes"""
    session_id: str = Field(..., description="Active session identifier")
    difficulty: str = Field("medium", description="Quiz difficulty level")
    question_count: int = Field(5, ge=1, le=10, description="Number of questions")

# ===== PRO MODE SUBSCRIPTION MODELS =====

class SubscriptionStatus(str, Enum):
    """Subscription status enumeration"""
    FREE = "free"
    PRO = "pro"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class SubscriptionTier(str, Enum):
    """Subscription tier enumeration"""
    FREE = "free"
    PRO_MONTHLY = "pro_monthly"
    PRO_YEARLY = "pro_yearly"
    PRO_LIFETIME = "pro_lifetime"

class SubscriptionRequest(BaseModel):
    """Request model for subscription management"""
    user_id: str = Field(..., description="User identifier")
    subscription_tier: SubscriptionTier = Field(..., description="Subscription tier")
    payment_method: Optional[str] = Field(None, description="Payment method identifier")
    promo_code: Optional[str] = Field(None, description="Promotional code")

class SubscriptionResponse(BaseModel):
    """Response model for subscription information"""
    user_id: str
    status: SubscriptionStatus
    tier: SubscriptionTier
    subscription_start_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    is_active: bool
    features: List[str]

class TrialUsageRequest(BaseModel):
    """Request model for tracking trial usage"""
    user_id: str = Field(..., description="User identifier")
    feature: str = Field(..., description="Feature being used")

class UserSubscription(BaseModel):
    """User subscription data model"""
    user_id: str
    status: SubscriptionStatus
    tier: SubscriptionTier
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    payment_id: Optional[str] = None
    promo_code: Optional[str] = None
    qr_payment_id: Optional[str] = None
    payment_status: Optional[str] = None

class QRCodePaymentRequest(BaseModel):
    """Request model for QR code payment generation"""
    user_id: str
    tier: SubscriptionTier
    amount: float = Field(..., description="Payment amount")

class QRCodePaymentResponse(BaseModel):
    """Response model for QR code payment"""
    qr_code: str
    qr_image: str  # Base64 encoded QR code image
    amount: float
    tier: str
    expires_at: datetime
    payment_id: str

class PaymentVerificationRequest(BaseModel):
    """Request model for payment verification"""
    qr_code: str
    user_id: str

# Database utilities for Supabase session storage
import psycopg2
from psycopg2.extras import RealDictCursor
import json

# Database connection
def get_db_connection():
    """Get database connection to Supabase"""
    try:
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT")
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def init_sessions_table():
    """Initialize sessions table if it doesn't exist"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS study_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                messages JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                progress_data JSONB DEFAULT '{}',
                context_summary TEXT
            )
        """)
        
        # Create index for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON study_sessions(last_activity)
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Sessions table initialized successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error initializing sessions table: {e}")
        return False

# Session Management
class SessionManager:
    """Manages active study sessions and conversation context using Supabase"""
    
    def __init__(self):
        self.session_locks: Dict[str, asyncio.Lock] = {}
        # Initialize database table
        init_sessions_table()
    
    def create_session(self, user_id: str) -> StudySession:
        """Create a new multi-topic study session in Supabase"""
        session_id = str(uuid.uuid4())
        now = datetime.now()
        
        print(f"=== CREATING MULTI-TOPIC SESSION IN SUPABASE ===")
        print(f"Session ID: {session_id}")
        print(f"User ID: {user_id}")
        
        try:
            conn = get_db_connection()
            if not conn:
                raise Exception("Failed to connect to database")
            
            cursor = conn.cursor()
            
            # Create session in database
            cursor.execute("""
                INSERT INTO study_sessions (session_id, user_id, messages, created_at, last_activity, progress_data)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                session_id,
                user_id,
                json.dumps([]),  # Empty messages array
                now,
                now,
                json.dumps({
                    "concepts_covered": [],
                    "problems_solved": 0,
                    "quiz_scores": [],
                    "time_spent": 0,
                    "difficulty_progression": []
                })
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # Create local session object for immediate use
            session = StudySession(
                session_id=session_id,
                user_id=user_id,
                messages=[],
                created_at=now,
                last_activity=now,
                progress_data={
                    "concepts_covered": [],
                    "problems_solved": 0,
                    "quiz_scores": [],
                    "time_spent": 0,
                    "difficulty_progression": []
                },
                context_summary=None
            )
            
            self.session_locks[session_id] = asyncio.Lock()
            
            print(f"✅ Session created in Supabase: {session_id}")
            print(f"=== SUPABASE SESSION CREATED ===")
            
            return session
            
        except Exception as e:
            print(f"❌ Error creating session in Supabase: {e}")
            raise Exception(f"Failed to create session: {e}")
    
    def get_session(self, session_id: str) -> Optional[StudySession]:
        """Get an active session by ID from Supabase"""
        print(f"=== GETTING SESSION FROM SUPABASE ===")
        print(f"Requested Session ID: {session_id}")
        
        try:
            conn = get_db_connection()
            if not conn:
                print(f"❌ Database connection failed")
                return None
            
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch session from database
            cursor.execute("""
                SELECT * FROM study_sessions 
                WHERE session_id = %s
            """, (session_id,))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result:
                # Convert database row to StudySession object
                session = StudySession(
                    session_id=result['session_id'],
                    user_id=result['user_id'],
                    messages=self._deserialize_messages(result['messages']),
                    created_at=result['created_at'],
                    last_activity=result['last_activity'],
                    progress_data=result['progress_data'] or {},
                    context_summary=result['context_summary']
                )
                
                print(f"✅ Session found in Supabase: {session.session_id}")
                print(f"Session details: user_id={session.user_id}")
                print(f"Messages count: {len(session.messages)}")
                
                return session
            else:
                print(f"❌ Session NOT found in Supabase: {session_id}")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching session from Supabase: {e}")
            return None
        
        finally:
            print(f"=== SUPABASE SESSION LOOKUP COMPLETE ===")
    
    def _deserialize_messages(self, messages_json) -> List[ConversationMessage]:
        """Convert JSON messages back to ConversationMessage objects"""
        try:
            if not messages_json:
                return []
            
            messages = []
            for msg_data in messages_json:
                message = ConversationMessage(
                    role=MessageRole(msg_data['role']),
                    content=msg_data['content'],
                    timestamp=datetime.fromisoformat(msg_data['timestamp']),
                    metadata=msg_data.get('metadata')
                )
                messages.append(message)
            
            return messages
        except Exception as e:
            print(f"Error deserializing messages: {e}")
            return []
    
    def update_session_activity(self, session_id: str):
        """Update session last activity timestamp in Supabase"""
        try:
            conn = get_db_connection()
            if not conn:
                print(f"❌ Database connection failed for activity update")
                return
            
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE study_sessions 
                SET last_activity = %s
                WHERE session_id = %s
            """, (datetime.now(), session_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"✅ Session activity updated in Supabase: {session_id}")
            
        except Exception as e:
            print(f"❌ Error updating session activity: {e}")
    
    def add_message(self, session_id: str, role: MessageRole, content: str, metadata: Optional[Dict] = None):
        """Add a message to the session conversation in Supabase"""
        try:
            # Create message object
            message = ConversationMessage(
                role=role,
                content=content,
                timestamp=datetime.now(),
                metadata=metadata
            )
            
            # Get current session to add message locally
            session = self.get_session(session_id)
            if not session:
                print(f"❌ Cannot add message - session not found: {session_id}")
                return
            
            # Add message to local session object
            session.messages.append(message)
            
            # Update messages in Supabase
            conn = get_db_connection()
            if not conn:
                print(f"❌ Database connection failed for message update")
                return
            
            cursor = conn.cursor()
            
            # Serialize messages for database storage
            messages_data = []
            for msg in session.messages:
                messages_data.append({
                    'role': msg.role.value,
                    'content': msg.content,
                    'timestamp': msg.timestamp.isoformat(),
                    'metadata': msg.metadata
                })
            
            # Update messages in database
            cursor.execute("""
                UPDATE study_sessions 
                SET messages = %s, last_activity = %s
                WHERE session_id = %s
            """, (
                json.dumps(messages_data),
                datetime.now(),
                session_id
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"✅ Message added to Supabase session: {session_id}")
            
        except Exception as e:
            print(f"❌ Error adding message to Supabase: {e}")
            print(f"Message content: {content[:100]}...")
    
    def get_conversation_context(self, session_id: str, max_messages: int = 10) -> List[Dict]:
        """Get conversation context for AI processing from Supabase"""
        try:
            session = self.get_session(session_id)
            if not session:
                print(f"❌ Cannot get context - session not found: {session_id}")
                return []
            
            # Get recent messages (limit to max_messages)
            messages = session.messages[-max_messages:] if len(session.messages) > max_messages else session.messages
            
            # Filter out SYSTEM messages and only include USER and ASSISTANT messages
            # SYSTEM messages are handled separately in the API call
            conversation_messages = [
                {
                    "role": msg.role.value,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
                if msg.role.value in ["user", "assistant"]  # Exclude SYSTEM messages
            ]
            
            print(f"✅ Retrieved {len(conversation_messages)} conversation messages from Supabase")
            return conversation_messages
            
        except Exception as e:
            print(f"❌ Error getting conversation context: {e}")
            return []
    
    def summarize_context(self, session_id: str) -> str:
        """Create a summary of the conversation context from Supabase"""
        try:
            session = self.get_session(session_id)
            if not session:
                return ""
            
            if len(session.messages) < 5:
                return ""
            
            # Create a summary of key points discussed
            summary_prompt = f"""
            Summarize the key learning points from this multi-topic tutoring session:
            - Focus on main concepts, formulas, and problem-solving approaches discussed
            - Keep summary concise but comprehensive
            """
            
            # This would typically call the LLM to generate a summary
            # For now, return a basic summary
            return f"Multi-topic session: {len(session.messages)} messages exchanged, covering various concepts and problem-solving approaches."
            
        except Exception as e:
            print(f"❌ Error summarizing context: {e}")
            return ""

# Initialize session manager
session_manager = SessionManager()

# Test function for message preparation (can be removed in production)
def test_message_preparation():
    """Test the message preparation logic for role alternation"""
    print("=== Testing Message Preparation ===")
    
    # Test case 1: Normal conversation
    test_messages = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there!"},
        {"role": "user", "content": "How are you?"}
    ]
    
    system_prompt = "You are a helpful assistant."
    prepared = AIContentGenerator.prepare_conversation_messages(test_messages, system_prompt)
    
    print("Test 1 - Normal conversation:")
    for i, msg in enumerate(prepared):
        print(f"  {i}: {msg['role']} - {msg['content'][:50]}...")
    
    # Test case 2: Consecutive same roles
    test_messages_2 = [
        {"role": "user", "content": "First user message"},
        {"role": "user", "content": "Second user message"},
        {"role": "assistant", "content": "Assistant response"},
        {"role": "assistant", "content": "Another assistant response"}
    ]
    
    prepared_2 = AIContentGenerator.prepare_conversation_messages(test_messages_2, system_prompt)
    
    print("\nTest 2 - Consecutive same roles:")
    for i, msg in enumerate(prepared_2):
        print(f"  {i}: {msg['role']} - {msg['content'][:50]}...")
    
    # Test case 3: Empty messages
    prepared_3 = AIContentGenerator.prepare_conversation_messages([], system_prompt)
    
    print("\nTest 3 - Empty messages:")
    for i, msg in enumerate(prepared_3):
        print(f"  {i}: {msg['role']} - {msg['content'][:50]}...")
    
    print("=== End Testing ===")

# Uncomment the line below to run tests when the module is loaded
# test_message_preparation()

# AI Content Generation
class AIContentGenerator:
    """Handles AI-powered content generation for tutoring"""
    
    # create_system_prompt method removed - no longer needed for multi-topic support
    
    @staticmethod
    def prepare_conversation_messages(messages: List[Dict], system_prompt: str) -> List[Dict]:
        """
        Prepare conversation messages for Together AI API with strict role alternation.
        
        Together AI requires: system -> user -> assistant -> user -> assistant -> ...
        No consecutive messages with the same role are allowed.
        """
        # Start with system message
        prepared_messages = [{"role": "system", "content": system_prompt}]
        
        if not messages:
            return prepared_messages
        
        # Process conversation messages to ensure role alternation
        current_role = None
        merged_content = ""
        
        for msg in messages:
            msg_role = msg.get("role")
            msg_content = msg.get("content", "")
            
            # Skip messages without proper role/content
            if not msg_role or not msg_content:
                continue
            
            # If this is the first message after system, it must be user
            if current_role is None:
                if msg_role == "user":
                    prepared_messages.append({"role": "user", "content": msg_content})
                    current_role = "user"
                elif msg_role == "assistant":
                    # If first message is assistant, skip it and start with user
                    # Don't add placeholder messages that confuse the AI
                    continue
                continue
            
            # Check if role alternates properly
            if msg_role == current_role:
                # Same role - merge content
                merged_content += "\n\n" + msg_content
            else:
                # Different role - add the merged content from previous role
                if merged_content:
                    prepared_messages.append({"role": current_role, "content": merged_content})
                    merged_content = ""
                
                # Add current message
                prepared_messages.append({"role": msg_role, "content": msg_content})
                current_role = msg_role
        
        # Add any remaining merged content
        if merged_content:
            prepared_messages.append({"role": current_role, "content": merged_content})
        
        # Ensure we end with user role (Together AI requirement)
        if prepared_messages and prepared_messages[-1]["role"] == "assistant":
            # Don't add placeholder messages - let the AI respond naturally
            # The user's actual question should be the last message
            pass
        
        return prepared_messages

    @staticmethod
    async def generate_response(
        messages: List[Dict],
        system_prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        use_vision_model: bool = False,
        image_data: Optional[str] = None
    ) -> str:
        """Generate AI response using the appropriate model"""
        try:
            # Check if we need to use Gemini Vision
            if use_vision_model and image_data and gemini_model:
                print(f"🔄 Using Gemini Pro Vision for image analysis")
                
                # Prepare the prompt for Gemini Vision
                user_message = messages[-1]['content'] if messages else ""
                
                # Convert base64 to PIL Image for Gemini
                try:
                    import base64
                    from io import BytesIO
                    
                    # Remove data:image/...;base64, prefix if present
                    if ';base64,' in image_data:
                        image_data = image_data.split(';base64,')[1]
                    
                    # Decode base64 to image
                    image_bytes = base64.b64decode(image_data)
                    image = Image.open(BytesIO(image_bytes))
                    
                    # Create Gemini Vision prompt
                    vision_prompt = f"""
{system_prompt}

User Question: {user_message}

Please analyze this image and provide a comprehensive JEE-level solution.
"""
                    
                    # Generate response using Gemini Vision
                    response = gemini_model.generate_content([vision_prompt, image])
                    
                    if response.text:
                        return response.text.strip()
                    else:
                        return "I'm sorry, I couldn't analyze the image properly. Please try again or describe the problem in text."
                        
                except Exception as e:
                    print(f"Error in Gemini Vision processing: {e}")
                    # Fallback to text-only processing
                    pass
                    
            elif use_vision_model and image_data and not gemini_model:
                print("❌ Gemini Vision model not available - API key missing")
                return "I'm sorry, but image analysis is currently unavailable. The Gemini Vision API key is not configured. Please contact the administrator to enable image processing capabilities, or try describing your problem in text instead."
            
            # Fallback to Together AI for text-only or if Gemini fails
            print(f"🔄 Using Together AI: {DEFAULT_MODEL}")
            
            # Prepare messages for the API with proper role alternation
            api_messages = AIContentGenerator.prepare_conversation_messages(messages, system_prompt)
            
            # Log the final message array for debugging
            print(f"=== Together AI API Messages ===")
            for i, msg in enumerate(api_messages):
                print(f"Message {i}: role={msg['role']}, content_length={len(msg['content'])}")
                if len(msg['content']) > 100:
                    print(f"  Content preview: {msg['content'][:100]}...")
                else:
                    print(f"  Content: {msg['content']}")
                print(f"================================")
            
            response = llm_client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=api_messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"Error generating AI response: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to generate AI response")
    
    # get_syllabus_context method removed - no longer needed for multi-topic support

# Quiz Generation
class QuizGenerator:
    """Handles quiz generation and management"""
    
    @staticmethod
    def parse_quiz_json(text: str) -> Optional[Dict]:
        """Parse quiz JSON from AI response with fallback regex parsing"""
        text = text.strip()
        # Remove markdown code blocks
        text = text.replace("```json", "").replace("```", "").strip()
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback regex parsing
            import re
            try:
                question_match = re.search(r'"question":\s*"(.*?)"', text, re.DOTALL)
                options_match = re.search(r'"options":\s*{(.*?)}', text, re.DOTALL)
                answer_match = re.search(r'"correct_answer":\s*"(.*?)"', text, re.DOTALL)
                explanation_match = re.search(r'"explanation":\s*"(.*?)"', text, re.DOTALL)
                
                if not all([question_match, options_match, answer_match, explanation_match]):
                    return None
                
                question = question_match.group(1).strip().replace('\\n', '\n').replace('\\"', '"')
                options_str = options_match.group(1)
                correct_answer = answer_match.group(1).strip()
                explanation = explanation_match.group(1).strip().replace('\\n', '\n').replace('\\"', '"')
                
                options = {}
                option_matches = re.findall(r'"([A-D])":\s*"(.*?)"', options_str)
                for key, value in option_matches:
                    options[key] = value.strip().replace('\\n', '\n').replace('\\"', '"')
                
                if len(options) != 4:
                    return None
                
                return {
                    "question": question,
                    "options": options,
                    "correct_answer": correct_answer,
                    "explanation": explanation
                }
            
            except Exception as e:
                print(f"Regex parsing error: {e}")
                return None

# Study Plan Generator
class StudyPlanGenerator:
    """Handles personalized study plan generation"""
    
    @staticmethod
    async def generate_study_plan(request: StudyPlanRequest) -> StudyPlan:
        """Generate a personalized study plan based on exam date and chapters"""
        plan_id = str(uuid.uuid4())
        now = datetime.now()
        
        print(f"🎯 Generating study plan for {request.user_id}")
        print(f"📚 Subjects: {', '.join(request.subjects)}")
        print(f"📅 Exam Date: {request.exam_date or 'Not specified'}")
        print(f"📖 Exam Chapters: {', '.join(request.exam_chapters) if request.exam_chapters else 'Not specified'}")
        print(f"🎯 Goals: {', '.join(request.goals)}")
        print(f"📊 Current Level: {request.current_level}")
        print(f"⏰ Study Hours/Day: {request.study_hours_per_day}")
        
        # Step 1: Calculate available study days
        available_days = 7  # Default fallback
        
        if request.exam_date:
            # New exam-focused format
            try:
                exam_date = datetime.strptime(request.exam_date, "%Y-%m-%d")
                # Compare only date parts, not time
                now_date = now.date()
                exam_date_only = exam_date.date()
                available_days = (exam_date_only - now_date).days
                
                # Allow same-day plans (available_days = 0) and future plans
                if available_days < 0:
                    raise HTTPException(status_code=400, detail="Exam date must be today or in the future")
                
                # If it's today, set available_days to 1 for emergency same-day study
                if available_days == 0:
                    available_days = 1
                    print(f"📅 Same-day emergency plan: {available_days} day until exam")
                else:
                    print(f"📅 Exam-focused plan: {available_days} days until exam")
            except ValueError:
                print(f"⚠️ Invalid exam date format: {request.exam_date}, using default")
                available_days = 7
        elif request.duration_days:
            # Legacy format
            available_days = request.duration_days
            print(f"📅 Legacy format: {available_days} days")
        else:
            print(f"📅 No duration specified, using default: {available_days} days")
        
        print(f"📅 Available study days: {available_days}")
        
        # Step 2: Get real topics from database
        real_topics = await StudyPlanGenerator.get_real_topics_from_database(request.subjects)
        print(f"📖 Found {len(real_topics)} real topics from database")
        
        # Step 3: Create study plan based on available data
        if request.exam_date and request.exam_chapters:
            # Use new exam-focused algorithm
            daily_tasks = StudyPlanGenerator.create_exam_focused_plan(
                real_topics=real_topics,
                exam_chapters=request.exam_chapters,
                available_days=available_days,
                study_hours_per_day=request.study_hours_per_day,
                current_level=request.current_level,
                include_practice=request.include_practice
            )
        else:
            # Use legacy fallback algorithm
            daily_tasks = StudyPlanGenerator.create_fallback_plan(real_topics, available_days)
        
        plan = StudyPlan(
            plan_id=plan_id,
            user_id=request.user_id,
            subjects=request.subjects,
            exam_date=request.exam_date or "Not specified",
            exam_chapters=request.exam_chapters or ["General topics"],
            duration_days=available_days,
            goals=request.goals,
            daily_tasks=daily_tasks,
            created_at=now,
            progress={"completed_days": 0, "overall_progress": 0.0}
        )
        
        print(f"✅ Exam-focused study plan generated successfully with {len(daily_tasks)} daily tasks")
        return plan
    
    @staticmethod
    async def get_real_topics_from_database(subjects: List[str]) -> Dict[str, List[Dict]]:
        """Get real topics and chapters from the NCERT database"""
        try:
            conn = get_db_connection()
            if not conn:
                print("⚠️ Database connection failed, using fallback topics")
                return StudyPlanGenerator.get_fallback_topics(subjects)
            
            cursor = conn.cursor()
            topics_by_subject = {}
            
            for subject in subjects:
                subject_lower = subject.lower()
                
                # Query for chapters and topics based on subject using the correct schema
                # The database has: subjects -> chapters -> topics structure
                # First, let's find the subject ID by name (case-insensitive)
                subject_query = """
                SELECT id, name FROM subjects WHERE LOWER(name) = %s
                """
                
                try:
                    cursor.execute(subject_query, (subject_lower,))
                    subject_result = cursor.fetchone()
                    
                    if not subject_result:
                        print(f"⚠️ Subject '{subject}' not found in database, using fallback")
                        topics_by_subject[subject] = StudyPlanGenerator.get_fallback_topics_for_subject(subject)
                        continue
                    
                    subject_id, actual_subject_name = subject_result
                    print(f"📚 Found subject: {actual_subject_name} (ID: {subject_id})")
                    
                    # Now query for chapters and topics
                    query = """
                    SELECT DISTINCT c.name as chapter_name, t.name as topic_name, 
                           c.chapter_number, t.topic_number,
                           CASE 
                               WHEN c.chapter_number <= 3 THEN 'easy'
                               WHEN c.chapter_number <= 6 THEN 'medium'
                               ELSE 'hard'
                           END as difficulty_level
                    FROM chapters c
                    JOIN topics t ON c.id = t.chapter_id
                    WHERE c.subject_id = %s
                    ORDER BY c.chapter_number, t.topic_number
                    """
                    
                    # Execute the topics query
                    cursor.execute(query, (subject_id,))
                    results = cursor.fetchall()
                    
                    topics = []
                    for row in results:
                        topics.append({
                            "chapter": row[0],
                            "topic": row[1] if row[1] else "General",
                            "difficulty": row[2] if row[2] else "medium",
                            "estimated_hours": StudyPlanGenerator.estimate_topic_difficulty(row[2] if row[2] else "medium")
                        })
                    
                    topics_by_subject[subject] = topics
                    print(f"📖 Found {len(topics)} topics for {subject}")
                    
                except Exception as e:
                    print(f"Error querying {subject} topics: {e}")
                    topics_by_subject[subject] = StudyPlanGenerator.get_fallback_topics_for_subject(subject)
            
            cursor.close()
            conn.close()
            
            return topics_by_subject
            
        except Exception as e:
            print(f"Error getting topics from database: {e}")
            return StudyPlanGenerator.get_fallback_topics(subjects)
    
    @staticmethod
    def estimate_topic_difficulty(difficulty: str) -> int:
        """Estimate study hours based on topic difficulty"""
        difficulty_map = {
            "easy": 2,
            "medium": 4,
            "hard": 6,
            "advanced": 8
        }
        return difficulty_map.get(difficulty.lower(), 4)
    
    @staticmethod
    def get_fallback_topics(subjects: List[str]) -> Dict[str, List[Dict]]:
        """Fallback topics when database is unavailable"""
        fallback_topics = {
            "Physics": [
                {"chapter": "Units and Measurements", "topic": "Basic Concepts", "difficulty": "easy", "estimated_hours": 2},
                {"chapter": "Motion in Straight Line", "topic": "Kinematics", "difficulty": "easy", "estimated_hours": 3},
                {"chapter": "Motion in a Plane", "topic": "2D Motion", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Laws of Motion", "topic": "Newton's Laws", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Work Energy Power", "topic": "Energy Conservation", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "System of Particles", "topic": "Center of Mass", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Gravitation", "topic": "Universal Law", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Mechanical Properties", "topic": "Solids and Fluids", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Thermodynamics", "topic": "Heat and Work", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Kinetic Theory", "topic": "Gas Laws", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Oscillations", "topic": "Simple Harmonic Motion", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Waves", "topic": "Wave Motion", "difficulty": "medium", "estimated_hours": 4}
            ],
            "Chemistry": [
                {"chapter": "Some Basic Concepts", "topic": "Mole Concept", "difficulty": "easy", "estimated_hours": 3},
                {"chapter": "Structure of Atom", "topic": "Atomic Models", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Classification of Elements", "topic": "Periodic Table", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Chemical Bonding", "topic": "Molecular Structure", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Thermodynamics", "topic": "Chemical Energy", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Equilibrium", "topic": "Chemical Equilibrium", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Redox Reactions", "topic": "Oxidation-Reduction", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Organic Chemistry Basics", "topic": "Fundamentals", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Hydrocarbons", "topic": "Alkanes, Alkenes", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Solutions", "topic": "Concentration", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Electrochemistry", "topic": "Electrochemical Cells", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Chemical Kinetics", "topic": "Reaction Rates", "difficulty": "hard", "estimated_hours": 5}
            ],
            "Mathematics": [
                {"chapter": "Sets", "topic": "Set Theory", "difficulty": "easy", "estimated_hours": 2},
                {"chapter": "Relations and Functions", "topic": "Function Basics", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Trigonometric Functions", "topic": "Trigonometry", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Complex Numbers", "topic": "Imaginary Numbers", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Linear Inequalities", "topic": "Inequalities", "difficulty": "easy", "estimated_hours": 3},
                {"chapter": "Permutations and Combinations", "topic": "Counting", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Binomial Theorem", "topic": "Binomial Expansion", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Sequences and Series", "topic": "AP, GP, HP", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Straight Lines", "topic": "2D Geometry", "difficulty": "medium", "estimated_hours": 4},
                {"chapter": "Conic Sections", "topic": "Circles, Parabolas", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Limits and Derivatives", "topic": "Calculus Basics", "difficulty": "hard", "estimated_hours": 5},
                {"chapter": "Statistics", "topic": "Data Analysis", "difficulty": "easy", "estimated_hours": 3},
                {"chapter": "Probability", "topic": "Probability Theory", "difficulty": "hard", "estimated_hours": 5}
            ]
        }
        
        return {subject: fallback_topics.get(subject, []) for subject in subjects}
    
    @staticmethod
    def get_fallback_topics_for_subject(subject: str) -> List[Dict]:
        """Get fallback topics for a specific subject"""
        fallback_topics = StudyPlanGenerator.get_fallback_topics([subject])
        return fallback_topics.get(subject, [])
    
    @staticmethod
    def parse_ai_study_plan(ai_response: str, real_topics: Dict, duration_days: int) -> List[Dict]:
        """Parse AI-generated study plan and validate against real topics"""
        try:
            # Try to extract JSON from AI response
            import re
            
            # Look for JSON content
            json_match = re.search(r'```json\s*(.*?)\s*```', ai_response, re.DOTALL)
            if json_match:
                json_content = json_match.group(1)
            else:
                # Try to find JSON without markdown
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    json_content = json_match.group(0)
                else:
                    print("⚠️ No JSON found in AI response")
                    return []
            
            # Parse JSON
            plan_data = json.loads(json_content)
            
            if 'daily_tasks' not in plan_data:
                print("⚠️ No daily_tasks found in AI response")
                return []
            
            # Validate and enhance daily tasks
            validated_tasks = []
            for task in plan_data['daily_tasks']:
                # Ensure required fields exist
                validated_task = {
                    "day": task.get("day", 1),
                    "subjects": task.get("subjects", []),
                    "topics": task.get("topics", []),
                    "time_allocation": task.get("time_allocation", "2-3 hours"),
                    "tasks": task.get("tasks", ["Study", "Practice", "Review"]),
                    "milestones": task.get("milestones", "Complete daily objectives"),
                    "difficulty": task.get("difficulty", "medium"),
                    "practice_problems": task.get("practice_problems", 5)
                }
                
                # Validate topics exist in real database
                validated_topics = []
                for topic in validated_task["topics"]:
                    if StudyPlanGenerator.topic_exists_in_database(topic, real_topics):
                        validated_topics.append(topic)
                
                if validated_topics:
                    validated_task["topics"] = validated_topics
                    validated_tasks.append(validated_task)
            
            print(f"✅ Parsed {len(validated_tasks)} validated daily tasks from AI")
            return validated_tasks
            
        except Exception as e:
            print(f"Error parsing AI study plan: {e}")
            return []
    
    @staticmethod
    def topic_exists_in_database(topic: str, real_topics: Dict) -> bool:
        """Check if a topic exists in the real database"""
        topic_lower = topic.lower()
        for subject_topics in real_topics.values():
            for real_topic in subject_topics:
                if (topic_lower in real_topic["topic"].lower() or 
                    topic_lower in real_topic["chapter"].lower()):
                    return True
        return False
    
    @staticmethod
    def create_fallback_plan(real_topics: Dict, duration_days: int) -> List[Dict]:
        """Create a simple, stress-free fallback plan using real database topics with variety"""
        print("🔄 Creating simple database-driven study plan with variety")
        
        daily_tasks = []
        current_day = 1
        
        # Collect all topics
        all_topics = []
        for subject, topics in real_topics.items():
            for topic in topics:
                all_topics.append({
                    **topic,
                    "subject": subject
                })
        
        if not all_topics:
            return StudyPlanGenerator.create_simple_fallback_plan(duration_days)
        
        # Simple distribution: max 3 topics per day
        topics_per_day = min(3, max(1, len(all_topics) // duration_days))
        
        # Shuffle to avoid overwhelming students
        import random
        random.shuffle(all_topics)
        
        # Different task templates for variety
        task_templates = [
            {
                "tasks": [
                    "📖 Read the topic carefully",
                    "✏️ Solve 2-3 simple problems",
                    "📝 Write key points",
                    "🎯 Take your time - no rush!"
                ],
                "milestones": [
                    "Complete today's topics",
                    "Feel confident about basics",
                    "Ready for next day"
                ],
                "motivation": "You're making progress! Keep going!"
            },
            {
                "tasks": [
                    "📚 Study the concept step by step",
                    "🔄 Practice with 2-3 examples",
                    "📋 Summarize in your own words",
                    "⏰ Pace yourself - quality over speed!"
                ],
                "milestones": [
                    "Understand the fundamentals",
                    "Complete practice problems",
                    "Feel ready for tomorrow"
                ],
                "motivation": "Every concept you master brings you closer to success!"
            },
            {
                "tasks": [
                    "🔍 Explore the topic thoroughly",
                    "✍️ Work through practice questions",
                    "📖 Review key concepts",
                    "🎯 Focus on understanding, not memorizing!"
                ],
                "milestones": [
                    "Grasp the core concepts",
                    "Complete assigned problems",
                    "Confident for next session"
                ],
                "motivation": "You're building a strong foundation - keep it up!"
            },
            {
                "tasks": [
                    "📖 Dive deep into the material",
                    "🧮 Solve practice problems",
                    "📝 Create study notes",
                    "💡 Ask questions if needed!"
                ],
                "milestones": [
                    "Master the basics",
                    "Complete practice work",
                    "Ready for advancement"
                ],
                "motivation": "Your dedication is impressive! Keep pushing forward!"
            },
            {
                "tasks": [
                    "📚 Learn the concepts systematically",
                    "✏️ Work on practice exercises",
                    "📋 Take comprehensive notes",
                    "🌟 Celebrate small victories!"
                ],
                "milestones": [
                    "Understand the material",
                    "Finish practice problems",
                    "Feel confident moving forward"
                ],
                "motivation": "You're on the right track! Every day brings new knowledge!"
            }
        ]
        
        for day in range(1, duration_days + 1):
            if not all_topics:
                break
                
            # Take only a few topics per day
            day_topics = all_topics[:topics_per_day]
            all_topics = all_topics[topics_per_day:]
            
            # Select random template for variety
            template = random.choice(task_templates)
            
            daily_tasks.append({
                "day": day,
                "subjects": list(set(topic["subject"] for topic in day_topics)),
                "topics": [topic["topic"] for topic in day_topics],
                "time_allocation": "3-4 hours (relaxed pace)",
                "tasks": template["tasks"],
                "milestones": template["milestones"],
                "difficulty": "easy",
                "practice_problems": random.randint(2, 4),  # Random practice problems
                "stress_level": "low",
                "break_time": random.choice([
                    "Take breaks every hour!",
                    "Rest every 45 minutes!",
                    "Pause every 50 minutes!",
                    "Break every 40 minutes!"
                ]),
                "motivation": template["motivation"]
            })
        
        print(f"✅ Created simple fallback plan with {len(daily_tasks)} stress-free daily tasks")
        return daily_tasks

    @staticmethod
    def create_simple_fallback_plan(duration_days: int) -> List[Dict]:
        """Create a very simple, stress-free fallback plan with variety"""
        print("🔄 Creating simple stress-free fallback plan with variety")
        
        daily_tasks = []
        
        # Different simple task templates for variety
        simple_templates = [
            {
                "tasks": [
                    "📖 Read your textbook",
                    "✏️ Solve 1-2 problems",
                    "📝 Take notes",
                    "🎯 Don't rush - understand first!"
                ],
                "milestones": [
                    "Feel confident about today's topic",
                    "Ready for tomorrow",
                    "No stress, just learning!"
                ],
                "motivation": "You're doing amazing! Every small step counts."
            },
            {
                "tasks": [
                    "📚 Study basic concepts",
                    "🔄 Practice simple examples",
                    "📋 Write key points",
                    "⏰ Take it slow and steady!"
                ],
                "milestones": [
                    "Understand the fundamentals",
                    "Complete basic practice",
                    "Feel ready for next day"
                ],
                "motivation": "Progress happens one concept at a time!"
            },
            {
                "tasks": [
                    "🔍 Explore the basics",
                    "✍️ Work on simple problems",
                    "📖 Review core ideas",
                    "🌟 Celebrate small wins!"
                ],
                "milestones": [
                    "Grasp basic concepts",
                    "Finish simple exercises",
                    "Confident for tomorrow"
                ],
                "motivation": "You're building a strong foundation!"
            },
            {
                "tasks": [
                    "📖 Learn step by step",
                    "🧮 Practice basic problems",
                    "📝 Create simple notes",
                    "💡 Ask questions when needed!"
                ],
                "milestones": [
                    "Master the basics",
                    "Complete simple work",
                    "Ready for next session"
                ],
                "motivation": "Your dedication is inspiring!"
            },
            {
                "tasks": [
                    "📚 Study systematically",
                    "✏️ Work on basic exercises",
                    "📋 Take clear notes",
                    "🎯 Focus on understanding!"
                ],
                "milestones": [
                    "Understand the material",
                    "Finish basic problems",
                    "Feel confident moving forward"
                ],
                "motivation": "You're on the right track!"
            }
        ]
        
        for day in range(1, duration_days + 1):
            # Select random template for variety
            template = random.choice(simple_templates)
            
            daily_tasks.append({
                "day": day,
                "subjects": ["General Study"],
                "topics": ["Basic concepts"],
                "time_allocation": random.choice([
                    "2-3 hours (relaxed pace)",
                    "2-4 hours (comfortable pace)",
                    "3 hours (steady pace)",
                    "2.5 hours (gentle pace)"
                ]),
                "tasks": template["tasks"],
                "milestones": template["milestones"],
                "difficulty": "very easy",
                "practice_problems": random.randint(1, 3),  # Random practice problems
                "stress_level": "zero stress",
                "break_time": random.choice([
                    "Take breaks every 30 minutes!",
                    "Rest every 25 minutes!",
                    "Pause every 35 minutes!",
                    "Break every 20 minutes!"
                ]),
                "motivation": template["motivation"]
            })
        
        print(f"✅ Created simple fallback plan with {len(daily_tasks)} stress-free daily tasks")
        return daily_tasks

    @staticmethod
    def create_exam_focused_plan(real_topics: Dict, exam_chapters: List[str], available_days: int, 
                                study_hours_per_day: int, current_level: str, include_practice: bool) -> List[Dict]:
        """Create a simple, stress-free study plan"""
        print(f"🎯 Creating simple study plan for {available_days} days")
        
        # Collect all topics in a simple way
        all_topics = []
        for subject, topics in real_topics.items():
            for topic in topics:
                all_topics.append({
                    **topic,
                    "subject": subject
                })
        
        if not all_topics:
            print("⚠️ No topics found, creating simple fallback")
            return StudyPlanGenerator.create_simple_fallback_plan(available_days)
        
        # Simple distribution: 2-3 topics per day max
        daily_tasks = []
        topics_per_day = min(3, max(1, len(all_topics) // available_days))
        
        # Shuffle topics to avoid overwhelming students
        import random
        random.shuffle(all_topics)
        
        for day in range(1, available_days + 1):
            if not all_topics:
                break
            
            # Take only a few topics per day
            day_topics = all_topics[:topics_per_day]
            all_topics = all_topics[topics_per_day:]
            
            # Keep it simple and stress-free
            daily_task = {
                "day": day,
                "subjects": list(set(topic["subject"] for topic in day_topics)),
                "topics": [topic["topic"] for topic in day_topics],
                "time_allocation": f"{min(study_hours_per_day, 4)} hours (take breaks!)",
                "tasks": [
                    "📖 Read the topic once",
                    "✏️ Solve 1-2 simple problems",
                    "📝 Write 3 key points",
                    "🎯 Don't stress - quality over quantity!"
                ],
                "milestones": [
                    f"Complete {len(day_topics)} topics",
                    "Feel confident about basics",
                    "Ready for next day"
                ],
                "difficulty": "easy",
                "practice_problems": 2,
                "stress_level": "very low",
                "break_time": "Take breaks whenever you need them!",
                "motivation": "You're doing great! Small steps lead to big results."
            }
            
            daily_tasks.append(daily_task)
        
        print(f"✅ Created {len(daily_tasks)} simple, stress-free daily tasks")
        return daily_tasks

    @staticmethod
    async def extract_exam_info_from_chat(user_message: str, conversation_context: dict = None) -> dict:
        """Extract exam information with proper context accumulation across conversation turns"""
        from datetime import datetime
        
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Initialize with any existing information from context
        accumulated_info = {
            "exam_date": None,
            "subjects": [],
            "chapters": [],
            "study_hours": 4,
            "exam_type": "JEE"
        }
        
        # Build comprehensive context from previous conversation
        context_summary = f"Current date: {current_date}\n"
        
        if conversation_context and isinstance(conversation_context, list):
            context_summary += "\nPrevious conversation context:\n"
            for msg in conversation_context:
                if msg.get("role") == "user":
                    context_summary += f"User said: {msg.get('content', '')}\n"
                elif msg.get("role") == "assistant":
                    context_summary += f"Assistant responded: {msg.get('content', '')}\n"
        
        # Enhanced AI prompt that builds upon previous context
        ai_prompt = f"""
        You are a smart study plan assistant that REMEMBERS previous conversation context.
        
        {context_summary}
        
        Current user message: "{user_message}"
        
        Your task: Extract exam information from the CURRENT message AND combine it with ANY information already provided in previous messages.
        
        IMPORTANT: If the user mentioned something in previous messages (like "organic chemistry" or "tomorrow"), REMEMBER it and include it in your response.
        
        Return ONLY a JSON object with these fields:
        - exam_date: YYYY-MM-DD format (if mentioned anywhere in conversation, otherwise null)
        - subjects: list of subjects mentioned anywhere in conversation (Physics, Chemistry, Mathematics)
        - chapters: list of specific chapters/topics mentioned anywhere in conversation
        - study_hours: number of hours per day (default 4)
        - exam_type: JEE, NEET, or other
        
        Smart mapping:
        - "tomorrow" = next day from current date
        - "organic" = Chemistry subject + Organic Chemistry chapter
        - "mechanics" = Physics subject + Mechanics chapter
        - "calculus" = Mathematics subject + Calculus chapter
        
        ACCUMULATE information from ALL conversation turns, don't lose previous info!
        """
        
        try:
            messages = [{"role": "user", "content": ai_prompt}]
            system_prompt = "You are a context-aware study plan assistant. Extract and accumulate exam information from the ENTIRE conversation, not just the current message. Return ONLY valid JSON."
            
            response = await AIContentGenerator.generate_response(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=300,
                temperature=0.1
            )
            
            # Parse AI response
            import json
            import re
            
            # Clean the response to extract just the JSON
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                exam_info = json.loads(json_match.group())
            else:
                exam_info = json.loads(response.strip())
            
            # Ensure required fields exist
            exam_info.setdefault("exam_date", None)
            exam_info.setdefault("subjects", [])
            exam_info.setdefault("chapters", [])
            exam_info.setdefault("study_hours", 4)
            exam_info.setdefault("exam_type", "JEE")
            
            print(f"🎯 AI extracted exam info: {exam_info}")
            return exam_info
            
        except Exception as e:
            print(f"AI extraction error: {e}")
            # Fallback to basic info
            return {
                "exam_date": None,
                "subjects": [],
                "chapters": [],
                "study_hours": 4,
                "exam_type": "JEE"
            }

    @staticmethod
    def create_varied_feedback_message(missing_info: list, exam_info: dict, conversation_context: dict = None) -> str:
        """Create varied feedback messages asking for missing information"""
        import random
        
        # Different message templates for variety
        templates = [
            "🎯 **Let's get your study plan perfect!** I need a bit more information:\n\n",
            "🌟 **Almost there!** Just a few more details to create your personalized plan:\n\n",
            "💪 **Great start!** To make this plan work for YOU, I need:\n\n",
            "🚀 **Excited to help!** Let me get the full picture with these details:\n\n",
            "📚 **Study plan in progress!** Just need these final pieces:\n\n"
        ]
        
        # Different closing messages
        closings = [
            "\n**Example:** 'My JEE exam is on 23rd september, I need to study Physics Mechanics and Chemistry Organic, I can study 6 hours per day'",
            "\n**Try this:** 'My exam is on 23rd september, studying Physics Mechanics, can study 6 hours daily'",
            "\n**Sample format:** 'JEE on 23rd september, Physics Mechanics, 6 hours per day'",
            "\n**Quick format:** '23rd september exam, Physics Mechanics, 6 hours daily'",
            "\n**Like this:** 'Exam: 23rd september, Topics: Physics Mechanics, Time: 6 hours per day'"
        ]
        
        # Different emoji sets for variety
        emoji_sets = [
            {"missing": "❌", "found": "✅", "example": "💡"},
            {"missing": "⚠️", "found": "🎯", "example": "📝"},
            {"missing": "🔍", "found": "🌟", "example": "💪"},
            {"missing": "📋", "found": "✨", "example": "🚀"},
            {"missing": "🎯", "found": "💎", "example": "📚"}
        ]
        
        # Select random template and emojis
        template = random.choice(templates)
        closing = random.choice(closings)
        emojis = random.choice(emoji_sets)
        
        response = template
        response += "**What's Missing:**\n"
        response += "\n".join([f"{emojis['missing']} {info}" for info in missing_info])
        
        # Add what we found
        found_items = []
        if exam_info.get("exam_date"):
            found_items.append(f"{emojis['found']} **Exam Date:** {exam_info['exam_date']}")
        if exam_info.get("subjects"):
            found_items.append(f"{emojis['found']} **Subjects:** {', '.join(exam_info['subjects'])}")
        if exam_info.get("chapters"):
            found_items.append(f"{emojis['found']} **Chapters:** {', '.join(exam_info['chapters'])}")
        if exam_info.get("study_hours"):
            found_items.append(f"{emojis['found']} **Study Hours/Day:** {exam_info['study_hours']} hours")
        
        if found_items:
            response += f"\n\n**What I Found:**\n"
            response += "\n".join(found_items)
        
        response += closing
        
        return response

    @staticmethod
    def create_varied_motivational_response(plan: StudyPlan, exam_info: dict, conversation_context: dict = None) -> str:
        """Create varied motivational responses with different styles"""
        import random
        
        # Different motivational styles
        styles = [
            "energetic", "calm", "inspirational", "practical", "friendly"
        ]
        
        style = random.choice(styles)
        
        if style == "energetic":
            return StudyPlanGenerator._create_energetic_response(plan, exam_info)
        elif style == "calm":
            return StudyPlanGenerator._create_calm_response(plan, exam_info)
        elif style == "inspirational":
            return StudyPlanGenerator._create_inspirational_response(plan, exam_info)
        elif style == "practical":
            return StudyPlanGenerator._create_practical_response(plan, exam_info)
        else:
            return StudyPlanGenerator._create_friendly_response(plan, exam_info)

    @staticmethod
    def _create_energetic_response(plan: StudyPlan, exam_info: dict) -> str:
        """Create an energetic, high-energy motivational response"""
        days_until_exam = (datetime.strptime(plan.exam_date, "%Y-%m-%d") - datetime.now()).days
        
        response = f"""🚀 **BOOM! Your {exam_info['exam_type']} Study Plan is LOCKED AND LOADED!** 💥

🔥 **EXAM DATE:** {plan.exam_date} - {days_until_exam} DAYS TO DOMINATE! 🔥
⚡ **SUBJECTS:** {', '.join(plan.subjects)} - READY TO CONQUER!
🎯 **FOCUS AREAS:** {', '.join(plan.exam_chapters)} - LET'S CRUSH IT!

💪 **YOUR DAILY POWER PLAN:**
"""
        
        for i, task in enumerate(plan.daily_tasks[:5], 1):
            response += f"""
**DAY {i} - {', '.join(task['subjects'])}** ⚡
📖 TOPICS: {', '.join(task['topics'])}
⏰ TIME: {task['time_allocation']}
🎯 GOAL: {task['milestones'][0] if task['milestones'] else 'DOMINATE TOPICS!'}
"""
        
        if len(plan.daily_tasks) > 5:
            response += f"\n🔥 ... AND {len(plan.daily_tasks) - 5} MORE DAYS OF ABSOLUTE DOMINATION! 💪"
        
        response += f"""

🌟 **YOUR SUCCESS MINDSET:**
{days_until_exam} days might seem like a lot, but YOU'RE NOT JUST STUDYING - YOU'RE BUILDING YOUR FUTURE! 
Every problem you solve, every concept you master, brings you closer to your DREAM COLLEGE! 

💥 **YOUR BATTLE CRY:**
"Small daily improvements are the key to LONG-TERM DOMINATION. I will study SMART, I will study HARD!"

🚀 **READY TO LAUNCH?**
Your plan is designed for MAXIMUM IMPACT. Take it one day at a time, and remember: 
CONSISTENCY BEATS PERFECTION EVERY SINGLE TIME! 

YOU'RE GOING TO CRUSH THIS! 🔥💪✨"""
        
        return response

    @staticmethod
    def _create_calm_response(plan: StudyPlan, exam_info: dict) -> str:
        """Create a calm, reassuring motivational response"""
        days_until_exam = (datetime.strptime(plan.exam_date, "%Y-%m-%d") - datetime.now()).days
        
        response = f"""🌸 **Your Personalized {exam_info['exam_type']} Study Plan is Ready** ✨

📅 **Exam Date:** {plan.exam_date}
⏰ **Days Remaining:** {days_until_exam} days
📚 **Subjects:** {', '.join(plan.subjects)}
🎯 **Focus Areas:** {', '.join(plan.exam_chapters)}

🌿 **Your Gentle Daily Plan:**
"""
        
        for i, task in enumerate(plan.daily_tasks[:5], 1):
            response += f"""
**Day {i} - {', '.join(task['subjects'])}** 🌸
📖 Topics: {', '.join(task['topics'])}
⏰ Time: {task['time_allocation']}
🎯 Goal: {task['milestones'][0] if task['milestones'] else 'Complete topics peacefully'}
"""
        
        if len(plan.daily_tasks) > 5:
            response += f"\n🌸 ... and {len(plan.daily_tasks) - 5} more days of gentle, steady progress ✨"
        
        response += f"""

🌙 **Your Peaceful Mindset:**
{days_until_exam} days is plenty of time to prepare mindfully. Remember, every expert was once a beginner. 
You're not just studying - you're growing, learning, and building your future with care.

🌸 **Your Gentle Reminder:**
"Progress happens one peaceful step at a time. I will study with patience and kindness to myself."

✨ **Ready to Begin?**
Your plan is designed to be stress-free and achievable. Take it one gentle day at a time, 
and remember: steady progress beats rushed perfection every time.

You have everything you need to succeed. 🌸✨"""
        
        return response

    @staticmethod
    def _create_inspirational_response(plan: StudyPlan, exam_info: dict) -> str:
        """Create an inspirational, quote-filled motivational response"""
        days_until_exam = (datetime.strptime(plan.exam_date, "%Y-%m-%d") - datetime.now()).days
        
        # Different inspirational quotes
        quotes = [
            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
            "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
            "Believe you can and you're halfway there. - Theodore Roosevelt"
        ]
        
        quote = random.choice(quotes)
        
        response = f"""🌟 **Your Personalized {exam_info['exam_type']} Study Plan is Ready** ✨

📅 **Exam Date:** {plan.exam_date}
⏰ **Days Remaining:** {days_until_exam} days
📚 **Subjects:** {', '.join(plan.subjects)}
🎯 **Focus Areas:** {', '.join(plan.exam_chapters)}

💫 **Your Inspirational Daily Plan:**
"""
        
        for i, task in enumerate(plan.daily_tasks[:5], 1):
            response += f"""
**Day {i} - {', '.join(task['subjects'])}** ⭐
📖 Topics: {', '.join(task['topics'])}
⏰ Time: {task['time_allocation']}
🎯 Goal: {task['milestones'][0] if task['milestones'] else 'Achieve today milestone'}
"""
        
        if len(plan.daily_tasks) > 5:
            response += f"\n⭐ ... and {len(plan.daily_tasks) - 5} more days of inspired learning ✨"
        
        response += f"""

💫 **Your Inspirational Mindset:**
{days_until_exam} days is your canvas to paint your future. Remember, every expert was once a beginner. 
You're not just studying - you're crafting your destiny, one concept at a time.

🌟 **Today's Inspiration:**
"{quote}"

✨ **Your Success Mantra:**
"Every day, I grow stronger, wiser, and more prepared. I am building my future with purpose and passion."

🚀 **Ready to Soar?**
Your plan is designed to inspire greatness. Take it one inspired day at a time, 
and remember: the journey of a thousand miles begins with a single step.

Your dreams are waiting. Let's make them reality! 🌟✨"""
        
        return response

    @staticmethod
    def _create_practical_response(plan: StudyPlan, exam_info: dict) -> str:
        """Create a practical, actionable motivational response"""
        days_until_exam = (datetime.strptime(plan.exam_date, "%Y-%m-%d") - datetime.now()).days
        
        response = f"""📋 **Your Personalized {exam_info['exam_type']} Study Plan is Ready** ✅

📅 **Exam Date:** {plan.exam_date}
⏰ **Days Remaining:** {days_until_exam} days
📚 **Subjects:** {', '.join(plan.subjects)}
🎯 **Focus Areas:** {', '.join(plan.exam_chapters)}

📝 **Your Actionable Daily Plan:**
"""
        
        for i, task in enumerate(plan.daily_tasks[:5], 1):
            response += f"""
**Day {i} - {', '.join(task['subjects'])}** 📋
📖 Topics: {', '.join(task['topics'])}
⏰ Time: {task['time_allocation']}
🎯 Goal: {task['milestones'][0] if task['milestones'] else 'Complete assigned topics'}
"""
        
        if len(plan.daily_tasks) > 5:
            response += f"\n📋 ... and {len(plan.daily_tasks) - 5} more days of structured learning ✅"
        
        response += f"""

📊 **Your Strategic Approach:**
{days_until_exam} days gives you {days_until_exam * exam_info.get('study_hours', 4)} total study hours. 
You're not just studying - you're executing a strategic plan for success.

📈 **Your Success Metrics:**
- Daily progress tracking
- Topic completion goals
- Regular practice sessions
- Continuous improvement

✅ **Your Action Plan:**
"Every day, I will complete my assigned topics and track my progress. I will study efficiently and effectively."

📋 **Ready to Execute?**
Your plan is designed for maximum efficiency. Take it one actionable day at a time, 
and remember: consistent execution beats perfect planning every time.

Let's get to work! 📋✅"""
        
        return response

    @staticmethod
    def _create_friendly_response(plan: StudyPlan, exam_info: dict) -> str:
        """Create a friendly, supportive motivational response"""
        days_until_exam = (datetime.strptime(plan.exam_date, "%Y-%m-%d") - datetime.now()).days
        
        response = f"""😊 **Your Personalized {exam_info['exam_type']} Study Plan is Ready** 🎉

📅 **Exam Date:** {plan.exam_date}
⏰ **Days Remaining:** {days_until_exam} days
📚 **Subjects:** {', '.join(plan.subjects)}
🎯 **Focus Areas:** {', '.join(plan.exam_chapters)}

💝 **Your Friendly Daily Plan:**
"""
        
        for i, task in enumerate(plan.daily_tasks[:5], 1):
            response += f"""
**Day {i} - {', '.join(task['subjects'])}** 😊
📖 Topics: {', '.join(task['topics'])}
⏰ Time: {task['time_allocation']}
🎯 Goal: {task['milestones'][0] if task['milestones'] else 'Have fun learning these topics!'}
"""
        
        if len(plan.daily_tasks) > 5:
            response += f"\n😊 ... and {len(plan.daily_tasks) - 5} more days of enjoyable learning 🎉"
        
        response += f"""

💝 **Your Supportive Mindset:**
{days_until_exam} days is plenty of time to prepare with friends and family supporting you! 
You're not just studying - you're on an exciting journey to your dream college!

😊 **Your Friendly Reminder:**
"Learning is more fun when we do it together. I will study with joy and ask for help when I need it."

🎉 **Ready to Start This Adventure?**
Your plan is designed to be enjoyable and achievable. Take it one fun day at a time, 
and remember: learning is a journey, not a destination!

You've got this, and I'm here to cheer you on! 😊🎉"""
        
        return response

    @staticmethod
    def create_varied_error_message() -> str:
        """Create varied error messages with different tones"""
        import random
        
        error_messages = [
            "I'm here to help you succeed! 🌟 Let me try again - just tell me about your exam and what you want to study. We'll figure this out together! 💪",
            "Oops! Let's give this another shot! 🌟 Tell me about your exam goals and I'll create the perfect study plan for you! 💪",
            "No worries! 🌟 Let me try again - just share your exam details and study preferences. We'll get this right! 💪",
            "Let's start fresh! 🌟 Tell me about your exam and what you want to study. I'm here to help you succeed! 💪",
            "I'm here to support you! 🌟 Let me try again - just give me the details about your exam and study goals. We'll make this work! 💪"
        ]
        
        return random.choice(error_messages)

    @staticmethod
    def _get_month_number(month_name: str) -> int:
        """Helper function to convert month name to month number"""
        month_map = {
            "january": 1, "jan": 1,
            "february": 2, "feb": 2,
            "march": 3, "mar": 3,
            "april": 4, "apr": 4,
            "may": 5,
            "june": 6, "jun": 6,
            "july": 7, "jul": 7,
            "august": 8, "aug": 8,
            "september": 9, "sep": 9, "sept": 9,
            "october": 10, "oct": 10,
            "november": 11, "nov": 11,
            "december": 12, "dec": 12
        }
        return month_map.get(month_name.lower())

    @staticmethod
    async def generate_study_plan_from_chat(exam_info: dict, user_id: str, conversation_context: dict = None) -> StudyPlan:
        """Generate study plan from chat-extracted information"""
        # Validate that we have an exam date
        if not exam_info.get("exam_date"):
            raise ValueError("No exam date provided. Please specify when your exam is.")
        
        # Create StudyPlanRequest from chat info
        request = StudyPlanRequest(
            user_id=user_id,
            subjects=exam_info["subjects"] or ["Physics", "Chemistry", "Mathematics"],
            exam_date=exam_info["exam_date"],
            exam_chapters=exam_info["chapters"] or ["General topics"],
            goals=[f"Master {', '.join(exam_info['chapters'])} for {exam_info['exam_type']}"],
            current_level="intermediate",
            study_hours_per_day=exam_info["study_hours"],
            include_practice=True
        )
        
        return await StudyPlanGenerator.generate_study_plan(request)

    @staticmethod
    def create_motivational_response(plan: StudyPlan, exam_info: dict) -> str:
        """Create a motivational response with the study plan"""
        days_until_exam = (datetime.strptime(plan.exam_date, "%Y-%m-%d") - datetime.now()).days
        
        response = f"""🎯 **Your Personalized {exam_info['exam_type']} Study Plan is Ready!** 🚀

**📅 Exam Date:** {plan.exam_date}
**⏰ Days Remaining:** {days_until_exam} days
**📚 Subjects:** {', '.join(plan.subjects)}
**🎯 Focus Areas:** {', '.join(plan.exam_chapters)}

**💪 Here's Your Daily Plan:**
"""
        
        for task in plan.daily_tasks[:5]:  # Show first 5 days
            response += f"""
**Day {task['day']} - {', '.join(task['subjects'])}**
📖 Topics: {', '.join(task['topics'])}
⏰ Time: {task['time_allocation']}
🎯 Goal: {task['milestones'][0] if task['milestones'] else 'Complete topics'}
"""
        
        if len(plan.daily_tasks) > 5:
            response += f"\n... and {len(plan.daily_tasks) - 5} more days of focused study! 📚"
        
        response += f"""

**🌟 Motivation Corner:**
{days_until_exam} days might seem like a lot, but remember: every expert was once a beginner! 
You're not just studying - you're building your future. Every problem you solve, every concept you understand, 
brings you one step closer to your dream college! 💫

**🎯 Your Success Mantra:**
"Small daily improvements are the key to long-term success. I will study smart, not hard!"

**🚀 Ready to Start?**
Your plan is designed to be stress-free and achievable. Take it one day at a time, 
and remember: consistency beats perfection every time! 

You've got this! 🌟✨"""
        
        return response

# ===== PRO MODE SUBSCRIPTION MANAGEMENT =====

class SubscriptionManager:
    """Manages user subscriptions, trials, and feature access control"""
    
    def __init__(self):
        self.db_connection = None
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database connection for subscription management"""
        try:
            self.db_connection = get_db_connection()
            if self.db_connection:
                self._create_subscription_tables()
                print("✅ Subscription database initialized successfully")
            else:
                print("⚠️ No database connection available for subscriptions")
        except Exception as e:
            print(f"⚠️ Subscription database initialization failed: {e}")
    
    def _ensure_db_connection(self):
        """Ensure database connection is available - IMPROVED CONNECTION HANDLING"""
        if not self.db_connection:
            try:
                self.db_connection = get_db_connection()
                if self.db_connection:
                    self._create_subscription_tables()
            except Exception as e:
                print(f"⚠️ Failed to establish database connection: {e}")
                return False
        else:
            # Check if connection is still valid
            try:
                cursor = self.db_connection.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
            except Exception as e:
                print(f"⚠️ Database connection invalid, reconnecting: {e}")
                try:
                    self.db_connection.close()
                except:
                    pass
                self.db_connection = None
                # Retry connection with fresh attempt
                try:
                    self.db_connection = get_db_connection()
                    if self.db_connection:
                        self._create_subscription_tables()
                except Exception as retry_e:
                    print(f"⚠️ Retry connection failed: {retry_e}")
                    return False
        return self.db_connection is not None
    
    def _create_subscription_tables(self):
        """Create subscription tables if they don't exist"""
        try:
            cursor = self.db_connection.cursor()
            
            # Create user_subscriptions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_subscriptions (
                    user_id VARCHAR(255) PRIMARY KEY,
                    status VARCHAR(50) NOT NULL DEFAULT 'free',
                    tier VARCHAR(50) NOT NULL DEFAULT 'free',
                    subscription_start_date TIMESTAMP,
                    subscription_end_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment_id VARCHAR(255),
                    promo_code VARCHAR(100),
                    qr_payment_id VARCHAR(255),
                    payment_status VARCHAR(50) DEFAULT 'pending'
                )
            """)
            
            # Create trial_usage_log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trial_usage_log (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    feature VARCHAR(100) NOT NULL,
                    session_id VARCHAR(255),
                    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES user_subscriptions(user_id)
                )
            """)
            
            # Create payment_qr_codes table for QR code payments
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payment_qr_codes (
                    id SERIAL PRIMARY KEY,
                    qr_code VARCHAR(255) UNIQUE NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    tier VARCHAR(50) NOT NULL,
                    user_id VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    payment_id VARCHAR(255),
                    FOREIGN KEY (user_id) REFERENCES user_subscriptions(user_id)
                )
            """)
            
            self.db_connection.commit()
            cursor.close()
            print("✅ Subscription tables initialized successfully")
            
        except Exception as e:
            print(f"❌ Error creating subscription tables: {e}")
    
    async def get_user_subscription(self, user_id: str) -> UserSubscription:
        """Get user subscription information"""
        try:
            if not self._ensure_db_connection():
                # Database connection failed - this is a critical error
                print(f"❌ Database connection failed for user {user_id}")
                raise HTTPException(
                    status_code=500, 
                    detail="Database connection failed. Please try again later."
                )
            
            # Start fresh transaction
            self.db_connection.rollback()
            cursor = self.db_connection.cursor(cursor_factory=RealDictCursor)
            
            # Get subscription data
            cursor.execute(
                "SELECT * FROM user_subscriptions WHERE user_id = %s",
                (user_id,)
            )
            result = cursor.fetchone()
            
            cursor.close()
            
            if result:
                return UserSubscription(
                    user_id=result['user_id'],
                    status=SubscriptionStatus(result['status']),
                    tier=SubscriptionTier(result['tier']),
                    subscription_start_date=result.get('subscription_start_date'),
                    subscription_end_date=result.get('subscription_end_date'),
                    created_at=result.get('created_at'),
                    updated_at=result.get('updated_at'),
                    payment_id=result.get('payment_id'),
                    promo_code=result.get('promo_code')
                )
            else:
                # Create new free subscription
                return await self.create_free_subscription(user_id)
                
        except Exception as e:
            print(f"❌ Error getting user subscription: {e}")
            return UserSubscription(
                user_id=user_id,
                status=SubscriptionStatus.FREE,
                tier=SubscriptionTier.FREE
            )
    
    async def create_free_subscription(self, user_id: str) -> UserSubscription:
        """Create a new free subscription for user"""
        try:
            if not self._ensure_db_connection():
                print(f"❌ Database connection failed for user {user_id}")
                raise HTTPException(
                    status_code=500, 
                    detail="Database connection failed. Please try again later."
                )
            
            cursor = self.db_connection.cursor()
            # Create free subscription
            cursor.execute("""
                INSERT INTO user_subscriptions (user_id, status, tier)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
            """, (user_id, SubscriptionStatus.FREE.value, SubscriptionTier.FREE.value))
            
            self.db_connection.commit()
            cursor.close()
            
            return UserSubscription(
                user_id=user_id,
                status=SubscriptionStatus.FREE,
                tier=SubscriptionTier.FREE
            )
            
        except Exception as e:
            print(f"❌ Error creating free subscription: {e}")
            return UserSubscription(
                user_id=user_id,
                status=SubscriptionStatus.FREE,
                tier=SubscriptionTier.FREE
            )
    
    async def upgrade_subscription(self, user_id: str, tier: SubscriptionTier, 
                                 payment_id: str = None, promo_code: str = None) -> UserSubscription:
        """Upgrade user subscription to Pro tier"""
        try:
            if not self.db_connection:
                # Fallback: return upgraded subscription without persistence
                return UserSubscription(
                    user_id=user_id,
                    status=SubscriptionStatus.PRO,
                    tier=tier,
                    subscription_start_date=datetime.now(),
                    subscription_end_date=self._calculate_end_date(tier),
                    payment_id=payment_id,
                    promo_code=promo_code
                )
            
            start_date = datetime.now()
            end_date = self._calculate_end_date(tier)
            
            cursor = self.db_connection.cursor()
            cursor.execute("""
                UPDATE user_subscriptions 
                SET status = %s, tier = %s, subscription_start_date = %s, 
                    subscription_end_date = %s, payment_id = %s, promo_code = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (SubscriptionStatus.PRO.value, tier.value, start_date, end_date, 
                  payment_id, promo_code, user_id))
            
            self.db_connection.commit()
            cursor.close()
            
            return await self.get_user_subscription(user_id)
            
        except Exception as e:
            print(f"❌ Error upgrading subscription: {e}")
            raise HTTPException(status_code=500, detail="Failed to upgrade subscription")
    
    def _calculate_end_date(self, tier: SubscriptionTier) -> datetime:
        """Calculate subscription end date based on tier"""
        now = datetime.now()
        if tier == SubscriptionTier.PRO_MONTHLY:
            return now + timedelta(days=30)
        elif tier == SubscriptionTier.PRO_YEARLY:
            return now + timedelta(days=365)
        elif tier == SubscriptionTier.PRO_LIFETIME:
            return now + timedelta(days=36500)  # 100 years
        else:
            return now + timedelta(days=30)
    
    async def check_trial_eligibility(self, user_id: str) -> bool:
        """Check if user is eligible for trial sessions - STANDARDIZED"""
        try:
            subscription = await self.get_user_subscription(user_id)
            
            # Only free users can use trials
            if subscription.tier != SubscriptionTier.FREE:
                return False
                
            # Check if user has any trial sessions remaining for today
            conn = get_db_connection()
            if not conn:
                print(f"❌ Database connection failed for trial eligibility check")
                return False
                
            with conn.cursor() as cur:
                # Check total trial usage for today across all features
                cur.execute("""
                    SELECT COUNT(*) as used_today 
                    FROM trial_usage_log 
                    WHERE user_id = %s 
                    AND DATE(used_at) = CURRENT_DATE
                """, (user_id,))
                
                result = cur.fetchone()
                used_today = result[0] if result else 0
                
                # Daily trial limit: 5 sessions total per day (standardized)
                DAILY_TRIAL_LIMIT = 5
                
                has_trials = used_today < DAILY_TRIAL_LIMIT
                print(f"🔍 Trial eligibility check for {user_id}: {used_today}/{DAILY_TRIAL_LIMIT} used today")
                return has_trials
                
        except Exception as e:
            print(f"❌ Error checking trial eligibility: {e}")
            return False
    
    # Removed _reset_daily_trials_if_needed method - no longer needed
    
    async def use_trial_session(self, user_id: str, feature: str, session_id: str = None) -> bool:
        """Use a trial session for the specified feature - STANDARDIZED"""
        try:
            # First check if user is eligible for trials
            if not await self.check_trial_eligibility(user_id):
                print(f"❌ User {user_id} not eligible for trial sessions")
                return False
                
            # Get user's current trial usage
            conn = get_db_connection()
            if not conn:
                print(f"❌ Database connection failed for trial usage")
                return False
                
            with conn.cursor() as cur:
                # Check current trial usage for today (total across all features)
                cur.execute("""
                    SELECT COUNT(*) as used_today 
                    FROM trial_usage_log 
                    WHERE user_id = %s 
                    AND DATE(used_at) = CURRENT_DATE
                """, (user_id,))
                
                result = cur.fetchone()
                used_today = result[0] if result else 0
                
                # Trial limit: 5 sessions per day total (standardized)
                DAILY_TRIAL_LIMIT = 5
                
                if used_today >= DAILY_TRIAL_LIMIT:
                    print(f"❌ Daily trial limit reached: {used_today}/{DAILY_TRIAL_LIMIT}")
                    return False
                
                # Record trial usage
                cur.execute("""
                    INSERT INTO trial_usage_log (user_id, feature, session_id, used_at)
                    VALUES (%s, %s, %s, NOW())
                """, (user_id, feature, session_id))
                
                conn.commit()
                print(f"✅ Trial session used for {feature} by user {user_id} ({used_today + 1}/{DAILY_TRIAL_LIMIT})")
                return True
                
        except Exception as e:
            print(f"❌ Error using trial session: {e}")
            return False
    
    async def has_pro_access(self, user_id: str) -> bool:
        """Check if user has Pro access (active subscription)"""
        try:
            subscription = await self.get_user_subscription(user_id)
            
            # Check if subscription is active
            if subscription.status == SubscriptionStatus.PRO:
                if subscription.subscription_end_date:
                    return subscription.subscription_end_date > datetime.now()
                return True
            
            # Free users don't have Pro access - they need to use trials
            return False
            
        except Exception as e:
            print(f"❌ Error checking Pro access: {e}")
            return False  # Default to no access, let trial logic handle it
    
    async def get_available_features(self, user_id: str) -> List[str]:
        """Get list of available features for user"""
        try:
            subscription = await self.get_user_subscription(user_id)
            has_pro = await self.has_pro_access(user_id)
            
            # FREE FEATURES - Available to all users
            features = [
                "quick_help",           # AI chat and question answering
                "study_plan",           # Study plan generation
                "syllabus_questions",   # Generate questions from syllabus
                "problem_solver",       # Direct problem solving
                "image_solve",          # Image problem solving
                "advanced_quiz"         # Advanced quiz generation - FREE FEATURE
            ]
            
            if has_pro:
                features.extend([
                    "deep_study_mode",
                    "personalized_tutoring",
                    "unlimited_sessions",
                    "priority_support"
                ])
            
            return features
            
        except Exception as e:
            print(f"❌ Error getting available features: {e}")
            return ["quick_help", "study_plan"]  # Fallback to basic features
    
    async def cancel_subscription(self, user_id: str) -> bool:
        """Cancel user subscription"""
        try:
            if not self.db_connection:
                return True
            
            cursor = self.db_connection.cursor()
            cursor.execute("""
                UPDATE user_subscriptions 
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (SubscriptionStatus.CANCELLED.value, user_id))
            
            self.db_connection.commit()
            cursor.close()
            
            return True
            
        except Exception as e:
            print(f"❌ Error cancelling subscription: {e}")
            return False
    
    async def check_expired_subscriptions(self) -> List[str]:
        """Check for expired subscriptions and update their status - IMPROVED CONNECTION HANDLING"""
        try:
            # Use fresh connection instead of persistent one to avoid SSL issues
            conn = get_db_connection()
            if not conn:
                print("⚠️ No database connection available for subscription check")
                return []
            
            try:
                with conn.cursor() as cursor:
                    # Find expired subscriptions
                    cursor.execute("""
                        SELECT user_id FROM user_subscriptions 
                        WHERE status = %s AND subscription_end_date < CURRENT_TIMESTAMP
                    """, (SubscriptionStatus.PRO.value,))
                    
                    expired_users = [row[0] for row in cursor.fetchall()]
                    
                    # Update expired subscriptions
                    if expired_users:
                        cursor.execute("""
                            UPDATE user_subscriptions 
                            SET status = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ANY(%s)
                        """, (SubscriptionStatus.EXPIRED.value, expired_users))
                        
                        conn.commit()
                        print(f"✅ Updated {len(expired_users)} expired subscriptions")
                    
                    return expired_users
                    
            finally:
                # Always close the connection
                try:
                    conn.close()
                except:
                    pass  # Ignore close errors
                    
        except Exception as e:
            print(f"❌ Error checking expired subscriptions: {e}")
            return []
    
    async def renew_subscription(self, user_id: str, tier: SubscriptionTier) -> bool:
        """Renew user subscription"""
        try:
            if not self.db_connection:
                return True
            
            start_date = datetime.now()
            end_date = self._calculate_end_date(tier)
            
            cursor = self.db_connection.cursor()
            cursor.execute("""
                UPDATE user_subscriptions 
                SET status = %s, tier = %s, subscription_start_date = %s,
                    subscription_end_date = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (SubscriptionStatus.PRO.value, tier.value, start_date, end_date, user_id))
            
            self.db_connection.commit()
            cursor.close()
            
            return True
            
        except Exception as e:
            print(f"❌ Error renewing subscription: {e}")
            return False
    
    async def get_subscription_analytics(self) -> Dict[str, Any]:
        """Get subscription analytics for admin dashboard"""
        try:
            if not self.db_connection:
                return {"error": "Database not available"}
            
            cursor = self.db_connection.cursor(cursor_factory=RealDictCursor)
            
            # Get subscription counts by status
            cursor.execute("""
                SELECT status, COUNT(*) as count 
                FROM user_subscriptions 
                GROUP BY status
            """)
            status_counts = {row['status']: row['count'] for row in cursor.fetchall()}
            
            # Get trial usage statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN status = 'pro' THEN 1 ELSE 0 END) as pro_users
                FROM user_subscriptions
            """)
            trial_stats = cursor.fetchone()
            
            # Get recent subscriptions
            cursor.execute("""
                SELECT user_id, tier, subscription_start_date, status
                FROM user_subscriptions 
                WHERE subscription_start_date IS NOT NULL
                ORDER BY subscription_start_date DESC 
                LIMIT 10
            """)
            recent_subscriptions = cursor.fetchall()
            
            cursor.close()
            
            return {
                "status_counts": status_counts,
                "trial_statistics": {
                    "average_trial_used_today": float(trial_stats['avg_trial_used_today']) if trial_stats['avg_trial_used_today'] else 0,
                    "total_users": trial_stats['total_users'],
                    "trial_exhausted_today_count": trial_stats['trial_exhausted_today']
                },
                "recent_subscriptions": [dict(row) for row in recent_subscriptions]
            }
            
        except Exception as e:
            print(f"❌ Error getting subscription analytics: {e}")
            return {"error": str(e)}
    
    # ===== QR CODE PAYMENT METHODS =====
    
    def _generate_qr_code(self, data: str) -> str:
        """Generate QR code image and return as base64 string"""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
        except Exception as e:
            print(f"❌ Error generating QR code: {e}")
            return ""
    
    async def create_qr_payment(self, user_id: str, tier: SubscriptionTier, amount: float) -> QRCodePaymentResponse:
        """Create QR code payment for pro mode upgrade"""
        try:
            if not self._ensure_db_connection():
                raise HTTPException(status_code=500, detail="Database connection failed")
            
            # Generate unique payment ID
            payment_id = f"QR_{uuid.uuid4().hex[:12].upper()}"
            qr_code = f"PAY_{payment_id}"
            
            # Calculate expiry time (30 minutes from now)
            expires_at = datetime.now() + timedelta(minutes=30)
            
            # Create payment record
            cursor = self.db_connection.cursor()
            cursor.execute("""
                INSERT INTO payment_qr_codes (qr_code, amount, tier, user_id, status, expires_at, payment_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (qr_code, amount, tier.value, user_id, 'pending', expires_at, payment_id))
            
            self.db_connection.commit()
            cursor.close()
            
            # Generate QR code image with your actual UPI details
            qr_data = f"upi://pay?pa=dakshmalhotra930@oksbi&pn=AI%20Tutor%20Pro&tr={payment_id}&am=99&cu=INR&tn=Pro%20Mode%20Upgrade"
            qr_image = self._generate_qr_code(qr_data)
            
            print(f"✅ QR payment created: {payment_id} for user {user_id}")
            
            return QRCodePaymentResponse(
                qr_code=qr_code,
                qr_image=qr_image,
                amount=amount,
                tier=tier.value,
                expires_at=expires_at,
                payment_id=payment_id
            )
            
        except Exception as e:
            print(f"❌ Error creating QR payment: {e}")
            raise HTTPException(status_code=500, detail="Failed to create QR payment")
    
    async def verify_qr_payment(self, qr_code: str, user_id: str) -> Dict[str, Any]:
        """Verify QR code payment and upgrade subscription"""
        try:
            if not self._ensure_db_connection():
                raise HTTPException(status_code=500, detail="Database connection failed")
            
            cursor = self.db_connection.cursor(cursor_factory=RealDictCursor)
            
            # Get payment record
            cursor.execute("""
                SELECT * FROM payment_qr_codes 
                WHERE qr_code = %s AND user_id = %s AND status = 'pending'
            """, (qr_code, user_id))
            
            payment_record = cursor.fetchone()
            
            if not payment_record:
                raise HTTPException(status_code=404, detail="Payment not found or already processed")
            
            # Check if payment is expired
            if payment_record['expires_at'] < datetime.now():
                raise HTTPException(status_code=400, detail="Payment has expired")
            
            # For demo purposes, we'll simulate payment verification
            # In production, you would integrate with actual payment gateway
            payment_verified = True  # Simulate successful payment
            
            if payment_verified:
                # Update payment status
                cursor.execute("""
                    UPDATE payment_qr_codes 
                    SET status = 'completed' 
                    WHERE qr_code = %s
                """, (qr_code,))
                
                # Upgrade user subscription
                tier = SubscriptionTier(payment_record['tier'])
                await self.upgrade_subscription(
                    user_id=user_id,
                    tier=tier,
                    payment_id=payment_record['payment_id']
                )
                
                self.db_connection.commit()
                cursor.close()
                
                print(f"✅ Payment verified and subscription upgraded: {user_id}")
                
                return {
                    "success": True,
                    "message": "Payment verified successfully! Your Pro subscription is now active.",
                    "tier": tier.value,
                    "payment_id": payment_record['payment_id']
                }
            else:
                raise HTTPException(status_code=400, detail="Payment verification failed")
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error verifying QR payment: {e}")
            raise HTTPException(status_code=500, detail="Failed to verify payment")
    
    async def get_payment_status(self, qr_code: str) -> Dict[str, Any]:
        """Get payment status for a QR code"""
        try:
            if not self._ensure_db_connection():
                raise HTTPException(status_code=500, detail="Database connection failed")
            
            cursor = self.db_connection.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT status, amount, tier, expires_at, created_at
                FROM payment_qr_codes 
                WHERE qr_code = %s
            """, (qr_code,))
            
            payment_record = cursor.fetchone()
            cursor.close()
            
            if not payment_record:
                raise HTTPException(status_code=404, detail="Payment not found")
            
            return {
                "status": payment_record['status'],
                "amount": float(payment_record['amount']),
                "tier": payment_record['tier'],
                "expires_at": payment_record['expires_at'].isoformat(),
                "created_at": payment_record['created_at'].isoformat(),
                "is_expired": payment_record['expires_at'] < datetime.now()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error getting payment status: {e}")
            raise HTTPException(status_code=500, detail="Failed to get payment status")

# Initialize subscription manager
subscription_manager = SubscriptionManager()

# ===== PRO MODE MIDDLEWARE AND DECORATORS =====

def require_pro_access(feature_name: str = "Deep Study Mode"):
    """Decorator to require Pro access for specific features using credit system"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user_id from request
            user_id = None
            request_data = None
            session_id = None
            
            # Try to get user_id from different request formats
            for arg in args:
                if hasattr(arg, 'user_id'):
                    user_id = arg.user_id
                    request_data = arg
                    if hasattr(arg, 'session_id'):
                        session_id = arg.session_id
                    break
                elif isinstance(arg, dict) and 'user_id' in arg:
                    user_id = arg['user_id']
                    request_data = arg
                    if 'session_id' in arg:
                        session_id = arg['session_id']
                    break
            
            if not user_id:
                raise HTTPException(
                    status_code=400, 
                    detail="User ID is required for Pro feature access"
                )
            
            # Map feature names to credit system feature names
            feature_mapping = {
                "Deep Study Mode": "deep_study_mode",
                "Study Plan Generator": "study_plan_generator", 
                "Advanced Quiz Generation": "problem_generator",
                "Pro AI Chat": "pro_ai_chat"
            }
            
            credit_feature_name = feature_mapping.get(feature_name, "deep_study_mode")
            
            # Check and consume credit
            can_use, message, credits_remaining = await check_and_consume_credit(
                user_id, credit_feature_name, session_id
            )
            
            if not can_use:
                # Check if it's a credit limit issue
                if "Insufficient credits" in message:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "Daily credit limit reached",
                            "message": f"You've used all your 5 free Pro credits for today! Subscribe to PraxisAI Pro for unlimited access to {feature_name}.",
                            "upgrade_required": True,
                            "feature": feature_name,
                            "credits_remaining": credits_remaining,
                            "credits_limit": 5
                        }
                    )
                else:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "Access denied",
                            "message": message,
                            "upgrade_required": True,
                            "feature": feature_name
                        }
                    )
            
            # User has access, proceed with function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# API Routes

@router.get("/status")
async def get_status():
    """Status endpoint for the agentic module"""
    try:
        # Get session count from Supabase
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM study_sessions")
            session_count = cursor.fetchone()[0]
            cursor.close()
            conn.close()
        else:
            session_count = 0
        
        return {
            "status": "active",
            "module": "Multi-Topic JEE Deep Study Mode",
            "active_sessions": session_count,
            "database": "connected" if conn else "disconnected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "active",
            "module": "Multi-Topic JEE Deep Study Mode",
            "active_sessions": 0,
            "database": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.post("/session/start")
async def start_study_session(request: StartSessionRequest):
    """Start a new multi-topic Deep Study Mode session"""
    try:
        # Create new session
        session = session_manager.create_session(
            user_id=request.user_id
        )
        
        # Create JEE-focused system message for multi-topic support
        system_prompt = """You are a JEE (Joint Entrance Examination) tutor specializing ONLY in Physics, Chemistry, and Mathematics. 

        CRITICAL RULE: You are NOT ChatGPT or a general AI assistant. You are a JEE PCM tutor ONLY.
        
        IMPORTANT: You are trained on a JEE database only. You have access to JEE PCM content, formulas, problems, and concepts.
        
        FORBIDDEN TOPICS (DO NOT ANSWER):
        - History (Mughals, Akbar, etc.)
        - Geography
        - Literature
        - Politics
        - Current events
        - General knowledge
        - Any non-PCM subject
        
        ALLOWED TOPICS ONLY:
        - Physics: Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics
        - Chemistry: Physical Chemistry, Organic Chemistry, Inorganic Chemistry  
        - Mathematics: Algebra, Calculus, Trigonometry, Geometry, Vectors
        
        If asked about ANY forbidden topic, respond with:
        "I'm trained on a JEE database only and can only help with Physics, Chemistry, and Mathematics questions for JEE preparation. Please ask me about JEE PCM topics instead."
        
        Your responses should be:
        - JEE PCM-focused with appropriate difficulty level and depth
        - Clear and structured with proper markdown formatting
        - Include mathematical formulas using LaTeX notation ($$ for display, $ for inline) when relevant
        - Provide step-by-step explanations suitable for JEE preparation
        - Use examples and analogies that help with JEE PCM concepts
        - Encourage active learning and critical thinking
        - Include JEE-specific tips, common mistakes to avoid, and exam strategies when relevant
        """
        
        # Generate welcome message
        welcome_message = f"""Welcome to Multi-Topic JEE Deep Study Mode! 

I'm your dedicated JEE tutor, here to help you master any subject or topic for your JEE preparation. I can assist with:

**JEE Subjects:**
- **Physics:** Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics
- **Chemistry:** Physical Chemistry, Organic Chemistry, Inorganic Chemistry
- **Mathematics:** Algebra, Calculus, Trigonometry, Geometry, Vectors

**JEE Learning Activities:**
- Concept explanations with JEE-level depth
- Problem-solving strategies and techniques
- Step-by-step solutions to JEE questions
- Common mistakes to avoid
- Exam strategies and time management tips
- Practice problems and mock questions

**What would you like to study today?** Just tell me the subject or topic (like "quantum mechanics", "organic reactions", or "calculus"), and I'll adapt my teaching to help you excel in JEE!"""
        
        # Add initial messages to session
        session_manager.add_message(
            session.session_id,
            MessageRole.SYSTEM,
            system_prompt
        )
        
        session_manager.add_message(
            session.session_id,
            MessageRole.ASSISTANT,
            welcome_message,
            {"type": "welcome", "multi_topic": True}
        )
        
        return {
            "session_id": session.session_id,
            "welcome_message": welcome_message,
            "created_at": session.created_at.isoformat()
        }
    
    except Exception as e:
        print(f"Error starting session: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to start study session")

@router.post("/session/chat")
async def chat_message(request: ChatMessageRequest):
    """Send a message in an active study session"""
    try:
        print(f"=== CHAT MESSAGE RECEIVED ===")
        print(f"Request Session ID: {request.session_id}")
        print(f"Request Message: {request.message[:100]}...")
        print(f"Context Hint: {request.context_hint}")
        print(f"🖼️ Has Image Data: {bool(request.image_data)}")
        if request.image_data:
            print(f"🖼️ Image Data Length: {len(request.image_data)} characters")
        
        # Get session
        session = session_manager.get_session(request.session_id)
        if not session:
            print(f"❌ SESSION NOT FOUND - Raising 404 error")
            raise HTTPException(status_code=404, detail="Session not found")
        
        print(f"✅ Session found successfully")
        
        # Update activity
        session_manager.update_session_activity(request.session_id)
        
        # Check and consume credit for AI Chat
        user_id = session.user_id
        can_use, message, credits_remaining = await check_and_consume_credit(
            user_id, "pro_ai_chat", request.session_id
        )
        
        if not can_use:
            print(f"❌ Credit check failed: {message}")
            raise HTTPException(status_code=402, detail=message)
        
        print(f"✅ Credit consumed successfully. Credits remaining: {credits_remaining}")
        
        # 🖼️ IMAGE ROUTING LOGIC: Check if this is an image problem and route accordingly
        if request.image_data:
            print("🖼️ Image detected in Deep Study Mode - using Gemini 1.5 Flash")
            
            # Check if Gemini Vision is available
            if gemini_model:
                print("🖼️ Gemini 1.5 Flash available - will analyze image directly")
                # Keep the original message for Gemini Vision processing
                # The image will be processed by the vision model
                enhanced_question = f"""
{request.message}

🖼️ IMAGE ANALYSIS REQUEST:
Please analyze the attached image and provide a comprehensive JEE-level solution to the problem shown.

Requirements:
- Identify the subject (Physics, Chemistry, or Mathematics) and specific topic
- Analyze any diagrams, formulas, or text in the image
- Provide step-by-step solution with proper mathematical notation
- Use LaTeX formatting for formulas and equations
- Include relevant concepts and explanations
- Give the final answer clearly

This will be processed by Gemini 1.5 Flash - a powerful AI model that can actually see and analyze the image content.
"""
                request.message = enhanced_question
                print("🖼️ Gemini Vision integration complete - image will be analyzed directly")
            else:
                print("🖼️ Gemini Vision not available - falling back to enhanced guidance")
                # Fallback to enhanced guidance if Gemini is not available
                image_size = len(request.image_data)
                image_analysis = f"""
{request.message}

🖼️ IMAGE DETECTED - Enhanced Analysis Mode:
I can see you've uploaded an image ({image_size} characters of base64 data).

Since I can't directly "see" the image, let me help you get the most accurate solution by asking targeted questions:

📊 IMAGE ANALYSIS:
- Image size: {image_size} characters (likely {image_size//1000:.1f}KB)
- Format: Base64 encoded image data
- Ready for intelligent processing

🎯 TO GET THE BEST SOLUTION, PLEASE TELL ME:
1. **Subject**: Physics, Chemistry, or Mathematics?
2. **Topic**: What specific chapter/topic is this from?
3. **Question Type**: What kind of problem is this? (e.g., calculation, proof, concept, etc.)
4. **Key Elements**: What do you see in the image? (formulas, diagrams, text, numbers, etc.)
5. **What You Need**: What specific help do you want?

Once you provide these details, I'll give you a comprehensive JEE-level solution with proper formulas, step-by-step explanations, and practice problems.

💡 TIP: The more specific you are, the better I can help you!
"""
                request.message = image_analysis
                print("🖼️ Enhanced guidance fallback complete")
        
        # Get conversation context BEFORE adding new user message
        conversation_context = session_manager.get_conversation_context(request.session_id)
        
        # Log the conversation context for debugging
        print(f"=== Chat Conversation Context ===")
        print(f"Session ID: {request.session_id}")
        print(f"Context messages count: {len(conversation_context)}")
        for i, msg in enumerate(conversation_context):
            print(f"  Context {i}: role={msg['role']}, content_length={len(msg['content'])}")
        print(f"================================")
        
        # Create JEE-focused system prompt for multi-topic support
        system_prompt = """You are a JEE (Joint Entrance Examination) tutor specializing ONLY in Physics, Chemistry, and Mathematics. 

        CRITICAL RULE: You are NOT ChatGPT or a general AI assistant. You are a JEE PCM tutor ONLY.
        
        IMPORTANT: You are trained on a JEE database only. You have access to JEE PCM content, formulas, problems, and concepts.
        
        FORBIDDEN TOPICS (DO NOT ANSWER):
        - History (Mughals, Akbar, etc.)
        - Geography
        - Literature
        - Politics
        - Current events
        - General knowledge
        - Any non-PCM subject
        
        ALLOWED TOPICS ONLY:
        - Physics: Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics
        - Chemistry: Physical Chemistry, Organic Chemistry, Inorganic Chemistry  
        - Mathematics: Algebra, Calculus, Trigonometry, Geometry, Vectors
        
        If asked about ANY forbidden topic, respond with:
        "I'm trained on a JEE database only and can only help with Physics, Chemistry, and Mathematics questions for JEE preparation. Please ask me about JEE PCM topics instead."
        
        Your responses should be:
        - JEE PCM-focused with appropriate difficulty level and depth
        - Clear and structured with proper markdown formatting
        - Include mathematical formulas using LaTeX notation ($$ for display, $ for inline) when relevant
        - Provide step-by-step explanations suitable for JEE preparation
        - Use examples and analogies that help with JEE PCM concepts
        - Encourage active learning and critical thinking
        - Include JEE-specific tips, common mistakes to avoid, and exam strategies when relevant
        """
        
        # Add context hint if provided
        if request.context_hint:
            system_prompt += f"\n\nContext Hint: {request.context_hint}"
        
        # CRITICAL FIX: Add the current user message to the conversation context BEFORE generating response
        current_user_message = {"role": "user", "content": request.message, "timestamp": datetime.now().isoformat()}
        messages_for_ai = conversation_context + [current_user_message]
        
        print(f"=== AI REQUEST CONTEXT ===")
        print(f"User question: {request.message}")
        print(f"Total messages for AI: {len(messages_for_ai)}")
        for i, msg in enumerate(messages_for_ai):
            print(f"  AI Message {i}: role={msg['role']}, content={msg['content'][:100]}...")
        print(f"==========================")
        
        # Generate response using conversation context INCLUDING the current user message
        # Use vision model if image data is present
        use_vision = bool(request.image_data)
        response = await AIContentGenerator.generate_response(
            messages=messages_for_ai,
            system_prompt=system_prompt,
            max_tokens=2048,
            temperature=0.7,
            use_vision_model=use_vision,
            image_data=request.image_data if request.image_data else None
        )
        
        # Add user message to session AFTER generating response
        session_manager.add_message(
            request.session_id,
            MessageRole.USER,
            request.message
        )
        
        # Add assistant response to session
        session_manager.add_message(
            request.session_id,
            MessageRole.ASSISTANT,
            response
        )
        
        return {
            "session_id": request.session_id,
            "response": response,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        print(f"Error in chat: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to process chat message")

@router.post("/session/solve")
async def problem_solve(request: ProblemSolveRequest):
    """Get step-by-step problem solving assistance"""
    try:
        # Get session
        session = session_manager.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update activity
        session_manager.update_session_activity(request.session_id)
        
        # Check and consume credit for Problem Solver
        user_id = session.user_id
        can_use, message, credits_remaining = await check_and_consume_credit(
            user_id, "problem_generator", request.session_id
        )
        
        if not can_use:
            print(f"❌ Credit check failed: {message}")
            raise HTTPException(status_code=402, detail=message)
        
        print(f"✅ Credit consumed successfully. Credits remaining: {credits_remaining}")
        
        # Create problem-solving prompt
        hint_levels = {
            1: "Provide a gentle hint to guide the student",
            2: "Give a more detailed hint with partial solution",
            3: "Provide a complete step-by-step solution"
        }
        
        system_prompt = f"""You are an expert JEE problem-solving tutor specializing in Physics, Chemistry, and Mathematics.
        
        Problem: {request.problem}
        Current Step: {request.step}
        Hint Level: {request.hint_level} - {hint_levels[request.hint_level]}
        
        Provide a {hint_levels[request.hint_level].lower()} that:
        - Guides the student through the problem-solving process
        - Explains the reasoning behind each step
        - Uses clear mathematical notation with LaTeX
        - Encourages critical thinking
        - Builds problem-solving skills
        - Is appropriate for JEE preparation level
        """
        
        # Generate response
        response = await AIContentGenerator.generate_response(
            messages=[{"role": "user", "content": f"Help me solve: {request.problem}"}],
            system_prompt=system_prompt,
            max_tokens=2048,
            temperature=0.6
        )
        
        # Add to session
        session_manager.add_message(
            request.session_id,
            MessageRole.ASSISTANT,
            response,
            {"type": "problem_solve", "step": request.step, "hint_level": request.hint_level}
        )
        
        return {
            "session_id": request.session_id,
            "solution": response,
            "step": request.step,
            "hint_level": request.hint_level,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"Error in problem solving: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate problem solution")

@router.post("/session/quiz")
@require_pro_access("Advanced Quiz Generation")
async def generate_quiz(request: QuizRequest):
    """Generate an interactive quiz for the session"""
    try:
        # Get session
        session = session_manager.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update activity
        session_manager.update_session_activity(request.session_id)
        
        # Create quiz generation prompt
        system_prompt = f"""You are an expert JEE quiz generator specializing in Physics, Chemistry, and Mathematics.
        
        Generate a {request.difficulty} difficulty quiz with {request.question_count} questions about JEE topics.
        
        Format each question as JSON:
        {{
            "question": "Question text with LaTeX math notation",
            "options": {{"A": "option A", "B": "option B", "C": "option C", "D": "option D"}},
            "correct_answer": "A",
            "explanation": "Detailed explanation of the correct answer"
        }}
        
        Return an array of {request.question_count} such objects.
        """
        
        # Generate quiz
        response = await AIContentGenerator.generate_response(
            messages=[{"role": "user", "content": f"Generate a {request.difficulty} quiz about JEE topics"}],
            system_prompt=system_prompt,
            max_tokens=3072,
            temperature=0.5
        )
        
        # Parse quiz JSON
        try:
            # Try to parse as JSON array
            quiz_data = json.loads(response)
            if isinstance(quiz_data, list):
                questions = quiz_data
            else:
                questions = [quiz_data]
        except json.JSONDecodeError:
            # Fallback: try to extract individual questions
            questions = []
            import re
            question_blocks = re.findall(r'\{[^{}]*"question"[^{}]*\}', response, re.DOTALL)
            for block in question_blocks:
                parsed = QuizGenerator.parse_quiz_json(block)
                if parsed:
                    questions.append(parsed)
        
        if not questions:
            raise HTTPException(status_code=500, detail="Failed to generate valid quiz questions")
        
        # Add quiz to session
        session_manager.add_message(
            request.session_id,
            MessageRole.ASSISTANT,
            f"Generated {len(questions)} quiz questions",
            {"type": "quiz", "questions": questions, "difficulty": request.difficulty}
        )
        
        return {
            "session_id": request.session_id,
            "questions": questions,
            "difficulty": request.difficulty,
            "question_count": len(questions),
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        print(f"Error generating quiz: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

@router.post("/plan/generate")
@require_pro_access("Study Plan Generator")
async def generate_study_plan(request: StudyPlanRequest):
    """Generate a personalized study plan"""
    try:
        plan = await StudyPlanGenerator.generate_study_plan(request)
        
        return {
            "plan_id": plan.plan_id,
            "subjects": plan.subjects,
            "exam_date": plan.exam_date,
            "exam_chapters": plan.exam_chapters,
            "duration_days": plan.duration_days,
            "goals": plan.subjects,
            "daily_tasks": plan.daily_tasks,
            "created_at": plan.created_at.isoformat(),
            "progress": plan.progress
        }
    
    except Exception as e:
        print(f"Error generating study plan: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate study plan")

@router.post("/chat/study-plan")
@require_pro_access("Study Plan Generator")
async def chat_study_plan(request: dict):
    """Enhanced chat interface for creating personalized study plans with conversation history"""
    try:
        user_message = request.get("message", "")
        user_id = request.get("user_id", "unknown_user")
        session_id = request.get("session_id", None)
        
        print(f"💬 Study plan chat request from {user_id}: {user_message}")
        
        # Get or create session for conversation history
        if session_id:
            session = session_manager.get_session(session_id)
        else:
            # Create new session if none provided
            session = session_manager.create_session(user_id)
            session_id = session.session_id
        
        # Add user message to session history
        session_manager.add_message(session_id, MessageRole.USER, user_message)
        
        # Check if this is a follow-up question or new plan request
        conversation_context = session_manager.get_conversation_context(session_id)
        
        # Extract exam info from natural language (with context awareness)
        exam_info = await StudyPlanGenerator.extract_exam_info_from_chat(user_message, conversation_context)
        
        # Check what information we have and what's missing
        missing_info = []
        
        if not exam_info.get("exam_date"):
            missing_info.append("📅 **Exam Date** - When is your exam? (e.g., '23rd september', '15th january', 'next month')")
        
        if not exam_info.get("subjects"):
            missing_info.append("📚 **Subjects** - What subjects are you studying? (e.g., 'Physics', 'Chemistry', 'Mathematics')")
        
        if not exam_info.get("chapters"):
            missing_info.append("📖 **Chapters/Topics** - What specific topics? (e.g., 'Mechanics', 'Organic Chemistry', 'Calculus')")
        
        if missing_info:
            # Let AI create a natural response asking for missing information
            ai_prompt = f"""The student asked: "{user_message}"

I need to know: {', '.join(missing_info)}

Give them a natural, conversational response asking for this information. Be helpful and friendly, like a real tutor. Remember what they've already told you and only ask for what's missing."""
            
            messages = [{"role": "user", "content": ai_prompt}]
            system_prompt = "You are a supportive JEE tutor. Ask for missing information naturally. Never use templates. Remember previous conversation context."
            
            response = await AIContentGenerator.generate_response(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=200,
                temperature=0.8
            )
            
            # Add AI response to session history
            session_manager.add_message(session_id, MessageRole.ASSISTANT, response)
            
            return {
                "response": response,
                "needs_more_info": True,
                "session_id": session_id
            }
        
        # Generate personalized study plan with variety
        plan = await StudyPlanGenerator.generate_study_plan_from_chat(exam_info, user_id, conversation_context)
        
        # Let AI create a natural response about the plan
        ai_prompt = f"""The student asked: "{user_message}"

Based on this study plan, give them a natural, conversational response:
{plan.daily_tasks}

Be helpful and natural, like a real tutor. Don't use templates or repetitive patterns."""
        
        messages = [{"role": "user", "content": ai_prompt}]
        system_prompt = "You are a supportive JEE tutor. Give natural, helpful responses about study plans. Never use templates."
        
        motivational_response = await AIContentGenerator.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            max_tokens=400,
            temperature=0.8
        )
        
        # Add AI response to session history
        session_manager.add_message(session_id, MessageRole.ASSISTANT, motivational_response)
        
        return {
            "response": motivational_response,
            "plan": {
                "plan_id": plan.plan_id,
                "subjects": plan.subjects,
                "exam_date": plan.exam_date,
                "exam_chapters": plan.exam_chapters,
                "duration_days": plan.duration_days,
                "daily_tasks": plan.daily_tasks
            },
            "needs_more_info": False,
            "session_id": session_id
        }
        
    except Exception as e:
        print(f"Error in study plan chat: {e}")
        traceback.print_exc()
        
        # Let AI create a natural error response
        ai_prompt = f"""Something went wrong while processing: "{user_message}". Error: {str(e)}

Help the student understand what happened and what they can try next. Be natural and supportive."""
        
        messages = [{"role": "user", "content": ai_prompt}]
        system_prompt = "You are a supportive JEE tutor. Help students naturally when things go wrong. Never use templates."
        
        error_response = await AIContentGenerator.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            max_tokens=200,
            temperature=0.7
        )
        
        # Add error response to session history if session exists
        if 'session_id' in locals():
            session_manager.add_message(session_id, MessageRole.ASSISTANT, error_response)
        
        return {
            "response": error_response,
            "error": str(e),
            "needs_more_info": True,
            "session_id": session_id if 'session_id' in locals() else None
        }

@router.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """Get information about an active session"""
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "message_count": len(session.messages),
            "progress": session.progress_data
        }
    
    except Exception as e:
        print(f"Error getting session info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session information")

@router.get("/test-study-plan")
async def test_study_plan():
    """Test endpoint to verify study plan functionality"""
    try:
        # Test with sample data
        test_request = StudyPlanRequest(
            user_id="test_user",
            subjects=["Physics", "Chemistry", "Mathematics"],
            exam_date="2024-12-15",
            exam_chapters=["Mechanics", "Organic Chemistry", "Calculus"],
            goals=["Master exam topics", "Practice problems"],
            current_level="beginner",
            study_hours_per_day=6,
            include_practice=True
        )
        
        # Try to generate a plan
        plan = await StudyPlanGenerator.generate_study_plan(test_request)
        
        return {
            "status": "success",
            "message": "Study plan generation working",
            "plan_id": plan.plan_id,
            "subjects": plan.subjects,
            "exam_date": plan.exam_date,
            "exam_chapters": plan.exam_chapters,
            "duration_days": plan.duration_days,
            "daily_tasks_count": len(plan.daily_tasks),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Study plan test failed: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Study plan test failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

@router.get("/test-database")
async def test_database():
    """Test endpoint to check database connectivity and available subjects"""
    try:
        conn = get_db_connection()
        if not conn:
                    return {
            "status": "error",
            "message": "Database connection failed",
            "timestamp": datetime.now().isoformat()
        }
        
        cursor = conn.cursor()
        
        # Check available subjects
        cursor.execute("SELECT id, name FROM subjects ORDER BY name")
        subjects = cursor.fetchall()
        
        # Check available chapters
        cursor.execute("SELECT COUNT(*) FROM chapters")
        chapter_count = cursor.fetchone()[0]
        
        # Check available topics
        cursor.execute("SELECT COUNT(*) FROM topics")
        topic_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "message": "Database connection successful",
            "subjects": [{"id": s[0], "name": s[1]} for s in subjects],
            "chapter_count": chapter_count,
            "topic_count": topic_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Database test failed: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Database test failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/session/{session_id}/history")
async def get_session_history(session_id: str, limit: int = 20):
    """Get conversation history for a session"""
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get recent messages
        recent_messages = session.messages[-limit:] if len(session.messages) > limit else session.messages
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "role": msg.role.value,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in recent_messages
            ],
            "total_messages": len(session.messages)
        }
    
    except Exception as e:
        print(f"Error getting session history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session history")

@router.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End an active study session"""
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create session summary
        summary = session_manager.summarize_context(session_id)
        
        # Remove from Supabase
        try:
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM study_sessions WHERE session_id = %s", (session_id,))
                conn.commit()
                cursor.close()
                conn.close()
                print(f"✅ Session deleted from Supabase: {session_id}")
        except Exception as e:
            print(f"❌ Error deleting session from Supabase: {e}")
        
        # Remove from local locks
        if session_id in session_manager.session_locks:
            del session_manager.session_locks[session_id]
        
        return {
            "session_id": session_id,
            "status": "ended",
            "summary": summary,
            "duration_minutes": int((datetime.now() - session.created_at).total_seconds() / 60),
            "message_count": len(session.messages)
        }
    
    except Exception as e:
        print(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail="Failed to end session")

# Background task for session cleanup
async def cleanup_expired_sessions():
    """Clean up expired sessions periodically from Supabase"""
    while True:
        try:
            now = datetime.now()
            cutoff_time = now - timedelta(hours=MAX_SESSION_DURATION)
            
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()
                
                # Find expired sessions
                cursor.execute("""
                    SELECT session_id FROM study_sessions 
                    WHERE last_activity < %s
                """, (cutoff_time,))
                
                expired_sessions = [row[0] for row in cursor.fetchall()]
                
                if expired_sessions:
                    # Delete expired sessions
                    cursor.execute("""
                        DELETE FROM study_sessions 
                        WHERE session_id = ANY(%s)
                    """, (expired_sessions,))
                    
                    conn.commit()
                    print(f"🧹 Cleaned up {len(expired_sessions)} expired sessions from Supabase")
                
                cursor.close()
                conn.close()
            
        except Exception as e:
            print(f"❌ Error in session cleanup: {e}")
        
        # Run cleanup every hour
        await asyncio.sleep(3600)

# ===== PRO MODE SUBSCRIPTION ENDPOINTS =====

@router.get("/subscription/{user_id}")
async def get_subscription_status(user_id: str):
    """Get user subscription status and available features"""
    try:
        subscription = await subscription_manager.get_user_subscription(user_id)
        features = await subscription_manager.get_available_features(user_id)
        has_pro = await subscription_manager.has_pro_access(user_id)
        
        return SubscriptionResponse(
            user_id=subscription.user_id,
            status=subscription.status,
            tier=subscription.tier,
            subscription_start_date=subscription.subscription_start_date,
            subscription_end_date=subscription.subscription_end_date,
            is_active=has_pro,
            features=features
        )
        
    except Exception as e:
        print(f"❌ Error getting subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")

@router.post("/subscription/upgrade")
async def upgrade_subscription(request: SubscriptionRequest):
    """Upgrade user to Pro subscription"""
    try:
        # In a real implementation, you would:
        # 1. Process payment with payment provider
        # 2. Verify payment success
        # 3. Then upgrade subscription
        
        # For now, we'll simulate successful payment
        upgraded_subscription = await subscription_manager.upgrade_subscription(
            user_id=request.user_id,
            tier=request.subscription_tier,
            payment_id=f"pay_{secrets.token_hex(8)}",  # Simulate payment ID
            promo_code=request.promo_code
        )
        
        features = await subscription_manager.get_available_features(request.user_id)
        
        return {
            "success": True,
            "message": "Subscription upgraded successfully!",
            "subscription": SubscriptionResponse(
                user_id=upgraded_subscription.user_id,
                status=upgraded_subscription.status,
                tier=upgraded_subscription.tier,
                subscription_start_date=upgraded_subscription.subscription_start_date,
                subscription_end_date=upgraded_subscription.subscription_end_date,
                is_active=True,
                features=features
            )
        }
        
    except Exception as e:
        print(f"❌ Error upgrading subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to upgrade subscription")

@router.post("/subscription/cancel/{user_id}")
async def cancel_subscription(user_id: str):
    """Cancel user subscription"""
    try:
        success = await subscription_manager.cancel_subscription(user_id)
        
        if success:
            return {
                "success": True,
                "message": "Subscription cancelled successfully. You'll retain Pro access until the end of your billing period."
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")
            
    except Exception as e:
        print(f"❌ Error cancelling subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@router.post("/subscription/trial/use")
async def use_trial_session(request: TrialUsageRequest):
    """Use a trial session for a specific feature"""
    try:
        # Check if user is eligible for trial
        if not await subscription_manager.check_trial_eligibility(request.user_id):
            return {
                "success": False,
                "message": "No trial sessions remaining. Upgrade to Pro for unlimited access!",
                "upgrade_required": True
            }
        
        # Use trial session
        success = await subscription_manager.use_trial_session(
            user_id=request.user_id,
            feature=request.feature
        )
        
        if success:
            # Get actual trial usage count
            conn = get_db_connection()
            remaining_trials = 0
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT COUNT(*) as used_today 
                        FROM trial_usage_log 
                        WHERE user_id = %s 
                        AND DATE(used_at) = CURRENT_DATE
                    """, (request.user_id,))
                    result = cur.fetchone()
                    used_today = result[0] if result else 0
                    remaining_trials = max(0, 10 - used_today)  # 10 daily limit
            
            return {
                "success": True,
                "message": f"Trial session used for {request.feature}",
                "trial_sessions_remaining": remaining_trials,
                "sessions_remaining": remaining_trials,
                "feature": request.feature
            }
        else:
            return {
                "success": False,
                "message": "Failed to use trial session",
                "upgrade_required": True
            }
            
    except Exception as e:
        print(f"❌ Error using trial session: {e}")
        raise HTTPException(status_code=500, detail="Failed to use trial session")

@router.get("/subscription/features/{user_id}")
async def get_available_features(user_id: str):
    """Get list of available features for user"""
    try:
        features = await subscription_manager.get_available_features(user_id)
        subscription = await subscription_manager.get_user_subscription(user_id)
        
        return {
            "user_id": user_id,
            "features": features,
            "subscription_status": subscription.status,
            "trial_sessions_remaining": "unlimited",
            "has_pro_access": await subscription_manager.has_pro_access(user_id)
        }
        
    except Exception as e:
        print(f"❌ Error getting available features: {e}")
        raise HTTPException(status_code=500, detail="Failed to get available features")


@router.post("/subscription/renew/{user_id}")
async def renew_subscription(user_id: str, tier: SubscriptionTier):
    """Renew user subscription"""
    try:
        success = await subscription_manager.renew_subscription(user_id, tier)
        
        if success:
            subscription = await subscription_manager.get_user_subscription(user_id)
            return {
                "success": True,
                "message": "Subscription renewed successfully!",
                "subscription": subscription
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to renew subscription")
            
    except Exception as e:
        print(f"❌ Error renewing subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to renew subscription")

@router.get("/subscription/analytics")
async def get_subscription_analytics():
    """Get subscription analytics (admin endpoint)"""
    try:
        analytics = await subscription_manager.get_subscription_analytics()
        return analytics
        
    except Exception as e:
        print(f"❌ Error getting subscription analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription analytics")

@router.post("/subscription/check-expired")
async def check_expired_subscriptions():
    """Check and update expired subscriptions (admin endpoint) - IMPROVED ERROR HANDLING"""
    try:
        expired_users = await subscription_manager.check_expired_subscriptions()
        return {
            "success": True,
            "expired_count": len(expired_users),
            "expired_users": expired_users
        }
        
    except Exception as e:
        print(f"❌ Error checking expired subscriptions: {e}")
        # Return graceful error response instead of raising exception
        return {
            "success": False,
            "error": "Database connection issue during subscription check",
            "expired_count": 0,
            "expired_users": []
        }

# ===== PRO MODE ERROR HANDLING =====

class ProFeatureError(HTTPException):
    """Custom exception for Pro feature access errors"""
    def __init__(self, feature_name: str, user_id: str = None):
        self.feature_name = feature_name
        self.user_id = user_id
        super().__init__(
            status_code=403,
            detail={
                "error": "Pro subscription required",
                "message": f"{feature_name} is available only to Pro subscribers. Upgrade now for unlimited access!",
                "upgrade_required": True,
                "feature": feature_name,
                "user_id": user_id
            }
        )

class TrialLimitError(HTTPException):
    """Custom exception for trial limit reached"""
    def __init__(self, feature_name: str, user_id: str = None):
        self.feature_name = feature_name
        self.user_id = user_id
        super().__init__(
            status_code=403,
            detail={
                "error": "Trial session limit reached",
                "message": f"You've used all your trial sessions for {feature_name}. Upgrade to Pro for unlimited access!",
                "upgrade_required": True,
                "feature": feature_name,
                "user_id": user_id
            }
        )

# ===== PRO MODE FEATURE GATING HELPERS =====

async def check_feature_access(user_id: str, feature_name: str) -> bool:
    """Check if user has access to a specific feature"""
    try:
        has_pro = await subscription_manager.has_pro_access(user_id)
        if has_pro:
            return True
        
        # Check trial eligibility
        if await subscription_manager.check_trial_eligibility(user_id):
            # Use trial session
            trial_used = await subscription_manager.use_trial_session(user_id, feature_name)
            return trial_used
        
        return False
        
    except Exception as e:
        print(f"❌ Error checking feature access: {e}")
        return False

async def get_user_feature_status(user_id: str) -> Dict[str, Any]:
    """Get comprehensive feature access status for user"""
    try:
        subscription = await subscription_manager.get_user_subscription(user_id)
        features = await subscription_manager.get_available_features(user_id)
        has_pro = await subscription_manager.has_pro_access(user_id)
        trial_eligible = await subscription_manager.check_trial_eligibility(user_id)
        
        return {
            "user_id": user_id,
            "subscription_status": subscription.status,
            "subscription_tier": subscription.tier,
            "has_pro_access": has_pro,
            "trial_eligible": trial_eligible,
            "sessions_remaining": "unlimited",
            "available_features": features,
            "subscription_end_date": subscription.subscription_end_date,
            "is_subscription_active": subscription.subscription_end_date > datetime.now() if subscription.subscription_end_date else False
        }
        
    except Exception as e:
        print(f"❌ Error getting user feature status: {e}")
        return {
            "user_id": user_id,
            "error": "Failed to get feature status",
            "has_pro_access": False,
            "available_features": ["quick_help", "study_plan"]
        }

# ===== BACKGROUND TASKS =====

async def cleanup_expired_subscriptions():
    """Background task to check and update expired subscriptions - IMPROVED ERROR HANDLING"""
    while True:
        try:
            print("🔄 Checking for expired subscriptions...")
            expired_users = await subscription_manager.check_expired_subscriptions()
            if expired_users:
                print(f"✅ Updated {len(expired_users)} expired subscriptions")
            else:
                print("✅ No expired subscriptions found")
        except Exception as e:
            print(f"❌ Error in subscription cleanup: {e}")
            # Add exponential backoff for retries
            await asyncio.sleep(300)  # Wait 5 minutes before retry
            continue
        
        # Run cleanup every 24 hours
        await asyncio.sleep(86400)

# Start background cleanup task
@router.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    asyncio.create_task(cleanup_expired_sessions())
    asyncio.create_task(cleanup_expired_subscriptions())
    print("Multi-Topic JEE Deep Study Mode agentic module initialized with Pro mode support")

# Add conversational methods to StudyPlanGenerator class
def add_conversational_methods():
    """Add conversational methods to StudyPlanGenerator class"""
    
    @staticmethod
    def create_conversational_response(user_message: str, exam_info: dict, conversation_context: dict = None) -> str:
        """Create a conversational, AI-like response that feels more human"""
        import random
        
        # Different conversation styles
        conversation_styles = [
            "friendly_advisor",
            "motivational_coach", 
            "practical_planner",
            "encouraging_mentor",
            "supportive_friend"
        ]
        
        style = random.choice(conversation_styles)
        
        if style == "friendly_advisor":
            return StudyPlanGenerator._create_friendly_advisor_response(user_message, exam_info, conversation_context)
        elif style == "motivational_coach":
            return StudyPlanGenerator._create_motivational_coach_response(user_message, exam_info, conversation_context)
        elif style == "practical_planner":
            return StudyPlanGenerator._create_practical_planner_response(user_message, exam_info, conversation_context)
        elif style == "encouraging_mentor":
            return StudyPlanGenerator._create_encouraging_mentor_response(user_message, exam_info, conversation_context)
        else:
            return StudyPlanGenerator._create_supportive_friend_response(user_message, exam_info, conversation_context)

    @staticmethod
    def _create_friendly_advisor_response(user_message: str, exam_info: dict, conversation_context: dict = None) -> str:
        """Create a friendly, advisor-like response"""
        
        # Check what we have and what's missing
        missing_info = []
        found_info = []
        
        if not exam_info.get("exam_date"):
            missing_info.append("📅 **When is your exam?**")
        else:
            found_info.append(f"📅 **Exam Date:** {exam_info['exam_date']}")
            
        if not exam_info.get("subjects"):
            missing_info.append("📚 **What subjects are you studying?**")
        else:
            found_info.append(f"📚 **Subjects:** {', '.join(exam_info['subjects'])}")
            
        if not exam_info.get("chapters"):
            missing_info.append("📖 **What specific topics/chapters?**")
        else:
            found_info.append(f"📖 **Topics:** {', '.join(exam_info['chapters'])}")
            
        if not exam_info.get("study_hours"):
            missing_info.append("⏰ **How many hours can you study per day?**")
        else:
            found_info.append(f"⏰ **Study Time:** {exam_info['study_hours']} hours/day")
        
        # Create conversational response
        if missing_info:
            response = f"""Hey there! 👋 I'm excited to help you create the perfect study plan!

{chr(10).join(found_info) if found_info else ''}

I just need a few more details to make this plan work perfectly for YOU:

{chr(10).join(missing_info)}

**💡 Here are some natural ways to tell me:**
• "My JEE exam is on 23rd september, I need to study Physics Mechanics and Chemistry Organic, I can study 6 hours per day"
• "I have a test on 15th january, focusing on Calculus and Organic Chemistry, studying 4 hours daily"
• "Exam next month, Physics and Math, 5 hours per day"
• "Help me with mechanics test tomorrow"
• "Organic chemistry exam next week, 3 hours daily"

**🎯 Just talk naturally - I understand human language!**

**What would you like to tell me?** 😊"""
        else:
            response = f"""Perfect! 🎉 I have everything I need to create your personalized study plan!

{chr(10).join(found_info)}

**🚀 Let me craft the perfect plan for you...**
This is going to be amazing! I'll create a {len(exam_info.get('subjects', []))}-subject study plan that fits your {exam_info.get('study_hours', 4)}-hour daily schedule perfectly.

**💪 Your success is my priority!**"""
        
        return response

    @staticmethod
    def _create_motivational_coach_response(user_message: str, exam_info: dict, conversation_context: dict = None) -> str:
        """Create a motivational, coach-like response"""
        
        missing_info = []
        found_info = []
        
        if not exam_info.get("exam_date"):
            missing_info.append("📅 **When is your exam?** (This is crucial for planning!)")
        else:
            found_info.append(f"📅 **Exam Date:** {exam_info['exam_date']} - Let's countdown to success!")
            
        if not exam_info.get("subjects"):
            missing_info.append("📚 **What subjects are you conquering?**")
        else:
            found_info.append(f"📚 **Subjects:** {', '.join(exam_info['subjects'])} - Excellent choices!")
            
        if not exam_info.get("chapters"):
            missing_info.append("📖 **What specific topics are you targeting?**")
        else:
            found_info.append(f"📖 **Focus Areas:** {', '.join(exam_info['chapters'])} - Great focus!")
            
        if not exam_info.get("study_hours"):
            missing_info.append("⏰ **How many hours are you committing daily?**")
        else:
            found_info.append(f"⏰ **Daily Commitment:** {exam_info['study_hours']} hours - That's dedication!")
        
        if missing_info:
            response = f"""🔥 **BOOM! Let's get you UNSTOPPABLE!** 💥

{chr(10).join(found_info) if found_info else ''}

**🎯 To create your WINNING study plan, I need:**

{chr(10).join(missing_info)}

**💪 Examples that will make you UNSTOPPABLE:**
• "My JEE exam is on 23rd september, studying Physics Mechanics + Chemistry Organic, 6 hours daily commitment!"
• "Test on 15th january, focusing on Calculus + Organic Chemistry, 4 hours of focused study!"
• "Exam next month, Physics + Math, 5 hours of pure dedication!"

**🚀 Remember:** Every champion started with a plan. Let's make yours legendary!

**What's your next move, champion?** 🔥"""
        else:
            response = f"""🚀 **ABSOLUTELY PERFECT! You're ready to DOMINATE!** 💪

{chr(10).join(found_info)}

**🎯 This is what champions are made of!** I'm creating your personalized battle plan right now!

**⚡ Your {len(exam_info.get('subjects', []))}-subject strategy with {exam_info.get('study_hours', 4)}-hour daily commitment is going to be UNSTOPPABLE!**

**🔥 Let's make this happen! Your success story starts NOW!**"""
        
        return response

    @staticmethod
    def _create_practical_planner_response(user_message: str, exam_info: dict, conversation_context: dict = None) -> str:
        """Create a practical, planner-like response"""
        
        missing_info = []
        found_info = []
        
        if not exam_info.get("exam_date"):
            missing_info.append("📅 **Exam Date** - When is your exam?")
        else:
            found_info.append(f"📅 **Exam Date:** {exam_info['exam_date']}")
            
        if not exam_info.get("subjects"):
            missing_info.append("📚 **Subjects** - What are you studying?")
        else:
            found_info.append(f"📚 **Subjects:** {', '.join(exam_info['subjects'])}")
            
        if not exam_info.get("chapters"):
            missing_info.append("📖 **Topics** - What specific chapters?")
        else:
            found_info.append(f"📖 **Topics:** {', '.join(exam_info['chapters'])}")
            
        if not exam_info.get("study_hours"):
            missing_info.append("⏰ **Study Time** - Hours per day?")
        else:
            found_info.append(f"⏰ **Study Time:** {exam_info['study_hours']} hours/day")
        
        if missing_info:
            response = f"""📋 **Study Plan Status: In Progress** ✅

{chr(10).join(found_info) if found_info else ''}

**📊 Information Needed:**
{chr(10).join(missing_info)}

**💡 Quick Templates:**
• "JEE on 23rd september, Physics Mechanics + Chemistry Organic, 6 hours daily"
• "Test 15th january, Calculus + Organic Chemistry, 4 hours per day"
• "Exam next month, Physics + Math, 5 hours daily"

**🎯 Efficiency Note:** Complete information = optimal study plan

**Ready to proceed?** 📋"""
        else:
            response = f"""📋 **Study Plan Status: Complete** ✅

{chr(10).join(found_info)}

**📊 Plan Summary:**
• Subjects: {len(exam_info.get('subjects', []))}
• Daily Study Time: {exam_info.get('study_hours', 4)} hours
• Focus Areas: {len(exam_info.get('chapters', []))} topics

**🚀 Generating your personalized study plan...**

**📈 Expected Outcome:** Maximum efficiency with your {exam_info.get('study_hours', 4)}-hour daily commitment."""
        
        return response

    @staticmethod
    def _create_encouraging_mentor_response(user_message: str, exam_info: dict, conversation_context: dict = None) -> str:
        """Create an encouraging, mentor-like response"""
        
        missing_info = []
        found_info = []
        
        if not exam_info.get("exam_date"):
            missing_info.append("📅 **When is your exam?** (Let's plan your journey!)")
        else:
            found_info.append(f"📅 **Exam Date:** {exam_info['exam_date']} - Your journey begins!")
            
        if not exam_info.get("subjects"):
            missing_info.append("📚 **What subjects inspire you?**")
        else:
            found_info.append(f"📚 **Subjects:** {', '.join(exam_info['chapters'])} - Wonderful choices!")
            
        if not exam_info.get("chapters"):
            missing_info.append("📖 **What topics are calling to you?**")
        else:
            found_info.append(f"📖 **Focus Areas:** {', '.join(exam_info['chapters'])} - Excellent focus!")
            
        if not exam_info.get("study_hours"):
            missing_info.append("⏰ **How much time can you dedicate daily?**")
        else:
            found_info.append(f"⏰ **Daily Dedication:** {exam_info['study_hours']} hours - That's commitment!")
        
        if missing_info:
            response = f"""🌟 **Hello, future achiever!** ✨

{chr(10).join(found_info) if found_info else ''}

**💫 To create your personalized study journey, I'd love to know:**

{chr(10).join(missing_info)}

**💡 Let me guide you with examples:**
• "My JEE exam is on 23rd september, I'm passionate about Physics Mechanics and Chemistry Organic, I can dedicate 6 hours daily"
• "I have a test on 15th january, I'm focusing on Calculus and Organic Chemistry, I can study 4 hours per day"
• "My exam is next month, I'm studying Physics and Math, I can commit 5 hours daily"

**🌙 Remember:** Every expert was once a beginner. Your journey to success starts with this conversation!

**What would you like to share with me?** 🌟"""
        else:
            response = f"""🌟 **Magnificent! You're absolutely ready!** ✨

{chr(10).join(found_info)}

**💫 This is the beginning of something extraordinary!** I'm crafting your personalized study journey right now!

**🚀 Your {len(exam_info.get('subjects', []))}-subject adventure with {exam_info.get('study_hours', 4)}-hour daily dedication is going to be magical!**

**🌙 Let's create your success story together!**"""
        
        return response

    @staticmethod
    def _create_supportive_friend_response(user_message: str, exam_info: dict, conversation_context: dict = None) -> str:
        """Create a supportive, friend-like response"""
        
        missing_info = []
        found_info = []
        
        if not exam_info.get("exam_date"):
            missing_info.append("📅 **When is your exam?** (So I can plan with you!)")
        else:
            found_info.append(f"📅 **Exam Date:** {exam_info['exam_date']} - Got it!")
            
        if not exam_info.get("subjects"):
            missing_info.append("📚 **What subjects are you studying?** (I'm curious!)")
        else:
            found_info.append(f"📚 **Subjects:** {', '.join(exam_info['subjects'])} - Awesome choices!")
            
        if not exam_info.get("chapters"):
            missing_info.append("📖 **What specific topics?** (Let's get specific!)")
        else:
            found_info.append(f"📖 **Topics:** {', '.join(exam_info['chapters'])} - Awesome choices!")
            
        if not exam_info.get("study_hours"):
            missing_info.append("⏰ **How many hours can you study daily?** (Be honest!)")
        else:
            found_info.append(f"⏰ **Study Time:** {exam_info['study_hours']} hours/day - That's impressive!")
        
        if missing_info:
            response = f"""😊 **Hey there! I'm so excited to help you!** 🎉

{chr(10).join(found_info) if found_info else ''}

**💝 I just need a few more details to make your study plan perfect:**

{chr(10).join(missing_info)}

**💡 Here are some fun examples to help you:**
• "My JEE exam is on 23rd september, I'm studying Physics Mechanics and Chemistry Organic, I can study 6 hours daily"
• "I have a test on 15th january, focusing on Calculus and Organic Chemistry, 4 hours per day"
• "My exam is next month, Physics and Math, 5 hours daily"

**🎯 Pro tip:** The more you tell me, the better I can help you succeed!

**What's on your mind?** 😊"""
        else:
            response = f"""😊 **Perfect! You're absolutely amazing!** 🎉

{chr(10).join(found_info)}

**💝 I have everything I need to create your perfect study plan!**

**🚀 Let me craft something special for you...**
This {len(exam_info.get('subjects', []))}-subject plan with {exam_info.get('study_hours', 4)}-hour daily commitment is going to be incredible!

**💪 I believe in you! Let's make this happen together!**"""
        
        return response

    # Add methods to StudyPlanGenerator class
    StudyPlanGenerator.create_conversational_response = create_conversational_response
    StudyPlanGenerator._create_friendly_advisor_response = _create_friendly_advisor_response
    StudyPlanGenerator._create_motivational_coach_response = _create_motivational_coach_response
    StudyPlanGenerator._create_practical_planner_response = _create_practical_planner_response
    StudyPlanGenerator._create_encouraging_mentor_response = _create_encouraging_mentor_response
    StudyPlanGenerator._create_supportive_friend_response = _create_supportive_friend_response

# Initialize conversational methods
add_conversational_methods()

# ===== QR CODE PAYMENT API ENDPOINTS =====

@router.post("/payment/qr/create")
async def create_qr_payment(request: QRCodePaymentRequest):
    """Create QR code payment for pro mode upgrade"""
    try:
        # Define pricing for different tiers - FIXED AT ₹99
        pricing = {
            SubscriptionTier.PRO_MONTHLY: 99.0,
            SubscriptionTier.PRO_YEARLY: 99.0,
            SubscriptionTier.PRO_LIFETIME: 99.0
        }
        
        # Validate amount
        expected_amount = pricing.get(request.tier)
        if not expected_amount or request.amount != expected_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid amount for {request.tier.value}. Expected: ₹{expected_amount}"
            )
        
        # Create QR payment
        qr_payment = await subscription_manager.create_qr_payment(
            user_id=request.user_id,
            tier=request.tier,
            amount=request.amount
        )
        
        return qr_payment
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating QR payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create QR payment")

@router.post("/payment/qr/verify")
async def verify_qr_payment(request: PaymentVerificationRequest):
    """Verify QR code payment and upgrade subscription"""
    try:
        result = await subscription_manager.verify_qr_payment(
            qr_code=request.qr_code,
            user_id=request.user_id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error verifying QR payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")

@router.get("/payment/qr/status/{qr_code}")
async def get_qr_payment_status(qr_code: str):
    """Get payment status for a QR code"""
    try:
        status = await subscription_manager.get_payment_status(qr_code)
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

@router.get("/subscription/pricing")
async def get_subscription_pricing():
    """Get subscription pricing information"""
    try:
        pricing = {
            "tiers": [
                {
                    "tier": "pro_monthly",
                    "name": "Pro Monthly",
                    "price": 99.0,
                    "currency": "INR",
                    "duration": "1 month",
                    "features": [
                        "Unlimited Deep Study Mode sessions",
                        "Personalized tutoring",
                        "Priority support",
                        "Advanced analytics"
                    ]
                },
                {
                    "tier": "pro_yearly",
                    "name": "Pro Yearly",
                    "price": 99.0,
                    "currency": "INR",
                    "duration": "12 months",
                    "features": [
                        "Unlimited Deep Study Mode sessions",
                        "Personalized tutoring",
                        "Priority support",
                        "Advanced analytics",
                        "2 months free (17% savings)"
                    ]
                },
                {
                    "tier": "pro_lifetime",
                    "name": "Pro Lifetime",
                    "price": 99.0,
                    "currency": "INR",
                    "duration": "Lifetime",
                    "features": [
                        "Unlimited Deep Study Mode sessions",
                        "Personalized tutoring",
                        "Priority support",
                        "Advanced analytics",
                        "All future features included",
                        "Best value (67% savings)"
                    ]
                }
            ]
        }
        
        return pricing
        
    except Exception as e:
        print(f"❌ Error getting pricing: {e}")
        raise HTTPException(status_code=500, detail="Failed to get pricing information")

# Export the router
__all__ = ["router"]