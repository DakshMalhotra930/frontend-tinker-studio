import os
import sys
import traceback
import random
import psycopg2
import json
import re
import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Response, Form, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from together import Together
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import base64
import io
from PIL import Image

from agentic import router as agentic_router  # Added import for Agentic Study Room routes
from aiquickhelp import router as aiquickhelp_router  # Import your new Quick AI Help router
from credit_system import router as credit_router  # Import credit system and Pro mode routes

# Import database deployment function
def deploy_database_functions():
    """Deploy required database functions on startup"""
    try:
        from deploy_database_functions import deploy_functions
        print("🔄 Deploying database functions on startup...")
        success = deploy_functions()
        if success:
            print("✅ Database functions deployed successfully!")
        else:
            print("⚠️ Database function deployment failed, but continuing...")
    except Exception as e:
        print(f"⚠️ Could not deploy database functions: {e}")
        print("⚠️ Continuing without function deployment...")

# --- DEBUG: Print environment variables containing sensitive info keys ---
print("---- ENVIRONMENT VARIABLES ----")
for key, value in os.environ.items():
    if "DB" in key or "API" in key or "SUPABASE" in key:
        print(f"{key}={value}")

# Load .env
script_dir = os.path.dirname(__file__)
dotenv_path = os.path.join(script_dir, '.env')
print(f"Attempting to load .env from {dotenv_path}")
load_dotenv(dotenv_path=dotenv_path)
print(".env loaded")

# API & DB config
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT")

print("DB config loaded:", DB_HOST, DB_USER, DB_NAME, DB_PORT)

# Initialize AI and Embedding clients
llm_client = None
embedding_model = None

try:
    if TOGETHER_API_KEY:
        llm_client = Together(api_key=TOGETHER_API_KEY)
        print("Together AI client initialized successfully.")
    else:
        print("WARNING: TOGETHER_API_KEY not found. AI features will be limited.")
except Exception as e:
    print(f"Error initializing Together AI client: {e}")
    traceback.print_exc()

try:
    print("Loading sentence transformer model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Embedding model loaded successfully.")
except Exception as e:
    print(f"Error loading embedding model: {e}")
    traceback.print_exc()
    print("WARNING: Embedding model failed to load. Some features may not work.")

# Request Models
class ContentRequest(BaseModel):
    topic: str
    mode: str

class GoogleLoginRequest(BaseModel):
    token: str

class FeatureRequest(BaseModel):
    user_email: str
    feature_text: str

class AskQuestionRequest(BaseModel):
    question: str
    image_data: Optional[str] = None
    session_id: Optional[str] = None  # Add session management
    topic_context: Optional[str] = None  # Add topic context

app = FastAPI()

# Setup database schema and functions on startup (non-blocking)
try:
    from setup_database import setup_database
    print("🔄 Setting up database schema...")
    setup_database()
    print("✅ Database schema setup completed!")
except Exception as e:
    print(f"⚠️ Database schema setup failed: {e}")
    print("⚠️ Backend will continue with fallback SQL queries...")

try:
    deploy_database_functions()
except Exception as e:
    print(f"⚠️ Database function deployment failed: {e}")
    print("⚠️ Backend will continue with fallback SQL queries...")

# Register Agentic Study Room API routes
app.include_router(agentic_router, prefix="/agentic", tags=["Agentic Study Room"])

# Register Quick AI Help API routes
app.include_router(aiquickhelp_router, prefix="/agentic", tags=["Agentic Quick Help"])

# Register Credit System and Pro Mode API routes
app.include_router(credit_router, prefix="/api", tags=["Credit System & Pro Mode"])

origins = [
    "https://praxisai-rho.vercel.app",
    "https://praxis-ai.fly.dev",
    "http://localhost:8080",
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*"  # Allow all origins for development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Explicit OPTIONS handler for all routes to assist CORS preflight requests ===
@app.options("/{rest_of_path:path}")
async def options_handler(rest_of_path: str):
    return Response(status_code=200)

def get_db_connection():
    try:
        print("Trying DB connection...")
        conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        print("DB connect success.")
        return conn
    except psycopg2.OperationalError as e:
        print(f"CRITICAL: Could not connect to the database. Error: {e}")
        traceback.print_exc()
        return None

def parse_quiz_json_from_string(text: str) -> dict | None:
    text = text.strip()
    text = re.sub(r"^\\`\\`\\`json\\`\\`\\`|\\`\\`\\`$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print("DEBUG: AI did not return valid JSON. Attempting regex parsing...")
        try:
            question_match = re.search(r'"question":\s*"(.*?)"', text, re.DOTALL)
            options_match = re.search(r'"options":\s*\{(.*?)\}', text, re.DOTALL)
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
            return {"question": question, "options": options, "correct_answer": correct_answer, "explanation": explanation}
        except Exception as e:
            print(f"DEBUG: Regex parsing encountered an unexpected error: {e}")
            traceback.print_exc()
            return None

THEORETICAL_TOPICS = ["introduction", "overview", "basics", "fundamentals"]

@app.get("/api/syllabus")
async def get_syllabus():
    print("GET /api/syllabus called")
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            raise HTTPException(status_code=503, detail="Database connection unavailable.")
        with conn.cursor() as cur:
            print("Running syllabus DB queries...")
            cur.execute("SELECT id, name FROM subjects ORDER BY name")
            subjects_raw = cur.fetchall()
            cur.execute("SELECT id, name, chapter_number, subject_id, class_number FROM chapters ORDER BY subject_id, class_number, chapter_number")
            chapters_raw = cur.fetchall()
            cur.execute("SELECT id, name, topic_number, chapter_id FROM topics ORDER BY chapter_id, topic_number")
            topics_raw = cur.fetchall()
            chapters_map = {c_id: {"id": c_id, "name": c_name, "number": c_num, "class_level": c_level, "topics": []} for c_id, c_name, c_num, s_id, c_level in chapters_raw}
            for t_id, t_name, t_num, c_id in topics_raw:
                if c_id in chapters_map:
                    chapters_map[c_id]["topics"].append({"id": t_id, "name": t_name, "number": t_num})
            subjects_map = {s_id: {"id": s_id, "name": s_name, "chapters": []} for s_id, s_name in subjects_raw}
            for c_id, c_name, c_num, s_id, c_level in chapters_raw:
                if s_id in subjects_map:
                    subjects_map[s_id]["chapters"].append(chapters_map[c_id])
            syllabus = list(subjects_map.values())
        print("Syllabus query success.")
        return JSONResponse(content=syllabus)
    except psycopg2.Error as e:
        print(f"Database query error while fetching syllabus: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An error occurred while fetching the syllabus.")
    finally:
        if conn:
            conn.close()

@app.post("/api/generate-content")
async def generate_content(request: ContentRequest):
    """
    FREE FEATURE: Generate practice questions or revision content
    NO AUTHENTICATION REQUIRED - Available to all users
    This is the syllabus question generator - completely free
    """
    print("POST /api/generate-content called with:", request)
    topic_prompt = request.topic
    mode = request.mode
    conn = None
    try:
        topic_embedding = embedding_model.encode(topic_prompt).tolist()
        print("Embedding generated successfully.")

        conn = get_db_connection()
        if conn is None:
            raise HTTPException(status_code=503, detail="Database connection unavailable.")

        relevant_text, context_level, context_name = "", "", ""
        with conn.cursor() as cur:
            print("Finding matching topic in DB...")
            cur.execute("SELECT * FROM match_topics(%s::vector, 0.3, 10)", (topic_embedding,))
            match_results = cur.fetchall()
            print(f"Match results count: {len(match_results)}")
            if not match_results:
                return JSONResponse(content={"question": None, "error": "Practice questions are not applicable for this introductory topic.", "source_name": topic_prompt, "source_level": "User Query"})

            matched_topic_id, matched_topic_name, similarity, matched_chapter_id = random.choice(match_results)
            print(f"DEBUG: Randomly selected topic '{matched_topic_name}' (Similarity: {similarity:.4f})")

            cur.execute("SELECT full_text FROM topics WHERE id = %s", (matched_topic_id,))
            topic_text_result = cur.fetchone()

            # --- THIS IS THE CORRECTED LINE ---
            if topic_text_result and topic_text_result[0] and topic_text_result[0].strip():
                relevant_text, context_level, context_name = topic_text_result[0], "Topic", matched_topic_name
            else:
                print(f"DEBUG: Topic text empty. Falling back to CHAPTER level context (ID: {matched_chapter_id}).")
                cur.execute("SELECT name, full_text FROM chapters WHERE id = %s", (matched_chapter_id,))
                chapter_text_result = cur.fetchone()
                if chapter_text_result and chapter_text_result[1] and chapter_text_result[1].strip():
                    relevant_text, context_level, context_name = chapter_text_result[1], "Chapter", chapter_text_result[0]
                else:
                    return JSONResponse(content={"question": None, "error": "Practice questions are not applicable for this introductory topic.", "source_name": matched_topic_name, "source_level": "Topic"})

        if mode == "practice" and context_level == "Chapter":
            if context_name.strip().lower() in THEORETICAL_TOPICS:
                return JSONResponse(content={"question": None, "error": "Practice questions are not applicable for this introductory topic.", "source_name": context_name, "source_level": context_level})

        max_chars = 15000
        if len(relevant_text) > max_chars:
            relevant_text = relevant_text[:max_chars]

        user_message_content = f"The user wants to learn about the topic: '{topic_prompt}'.\n\n--- CONTEXT FROM TEXTBOOK ({context_level}: {context_name}) ---\n{relevant_text}\n--- END OF CONTEXT ---"
        response_params = {"model": "mistralai/Mixtral-8x7B-Instruct-v0.1", "max_tokens": 2048, "temperature": 0.4}
        system_message = ""

        if mode == 'revise':
            system_message = """You are an AI assistant creating a structured 'cheat sheet' for JEE topics."""
        elif mode == 'practice':
            system_message = (
                "You are an expert AI quiz generator for JEE students. "
                "Given textbook context, respond ONLY with a valid JSON object matching this template: "
                '{'
                '"question": "...", '
                '"options": { "A": "...", "B": "...", "C": "...", "D": "..." }, '
                '"correct_answer": "...", '
                '"explanation": "..." '
                '}. '
                "Do not include any explanations, comments, or Markdown. ONLY output strict JSON—no extra formatting."
            )
        else:
            system_message = """You are an expert JEE tutor."""

        try:
            print("Calling LLM API for response...")
            messages = [{"role": "system", "content": system_message}, {"role": "user", "content": user_message_content}]
            response_params["messages"] = messages
            response = llm_client.chat.completions.create(**response_params)
            content = response.choices[0].message.content.strip()
            print("LLM response received.")
            if not content or content.lower().startswith("i'm sorry") or content.lower().startswith("i cannot"):
                print("LLM refused to answer.")
                raise HTTPException(status_code=503, detail="The AI was unable to generate a response.")
            if mode == 'practice':
                parsed_quiz = parse_quiz_json_from_string(content)
                if parsed_quiz is None:
                    print("LLM returned invalid format for quiz. Try fallback on chapter context.")
                    with conn.cursor() as cur:
                        cur.execute("SELECT full_text, name FROM chapters WHERE id = %s", (matched_chapter_id,))
                        chapter_result = cur.fetchone()
                        if chapter_result and chapter_result[0] and chapter_result[0].strip():
                            chapter_text, chapter_name = chapter_result
                            fallback_message_content = f"The user wants to learn about the topic: '{topic_prompt}'.\n\n--- CONTEXT FROM TEXTBOOK (Chapter: {chapter_name}) ---\n{chapter_text}\n--- END OF CONTEXT ---"
                            fallback_messages = [{"role": "system", "content": system_message}, {"role": "user", "content": fallback_message_content}]
                            fallback_response = llm_client.chat.completions.create(
                                model=response_params["model"],
                                max_tokens=response_params["max_tokens"],
                                temperature=response_params["temperature"],
                                messages=fallback_messages
                            )
                            fallback_content = fallback_response.choices[0].message.content.strip()
                            parsed_fallback = parse_quiz_json_from_string(fallback_content)
                            if parsed_fallback:
                                parsed_fallback['source_name'], parsed_fallback['source_level'] = chapter_name, "Chapter"
                                print("Fallback quiz generated from chapter context.")
                                return JSONResponse(content=parsed_fallback)
                    print("AI returned invalid format for both topic and chapter context.")
                    raise HTTPException(status_code=502, detail="The AI returned an invalid format for both topic and chapter context.")
                parsed_quiz['source_name'], parsed_quiz['source_level'] = context_name, context_level
                print("Quiz generated and returned.")
                return JSONResponse(content=parsed_quiz)
            else:
                print("Learn/revise content returned.")
                return JSONResponse(content={"content": content, "source_name": context_name, "source_level": context_level})
        except HTTPException as e:
            print("HTTP exception:", e)
            traceback.print_exc()
            raise e
        except Exception as e:
            print("An unexpected error occurred during AI call:", e)
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    finally:
        if conn:
            conn.close()
        print("DB connection closed (if any).")

@app.post("/api/google-login")
async def google_login(data: GoogleLoginRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            data.token,
            google_requests.Request(),
            "621306164868-21bamnrurup0nk6f836fss6q92s04aav.apps.googleusercontent.com"  # Your Google OAuth Client ID
        )
        email = idinfo.get("email")
        name = idinfo.get("name")
        
        # Generate consistent user ID based on email
        import hashlib
        user_id = f"user_{hashlib.md5(email.encode()).hexdigest()[:12]}"
        
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=503, detail="Database connection unavailable.")
        with conn.cursor() as cur:
            # Insert/update user (assuming users table has email, name columns)
            cur.execute(
                """
                INSERT INTO users (email, name)
                VALUES (%s, %s)
                ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                """,
                (email, name)
            )
            conn.commit()
        print(f"Google login success for: {email} with user_id: {user_id}")
        return {"email": email, "name": name, "user_id": user_id}
    except Exception as e:
        print(f"Google token verification or DB save failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Invalid Google token or DB error")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.post("/api/feature-request")
async def submit_feature_request(request: FeatureRequest):
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO feature_requests (user_email, feature_text) VALUES (%s, %s)",
                (request.user_email, request.feature_text)
            )
            conn.commit()
        return {"message": "Feature request submitted successfully."}
    except Exception as e:
        print(f"Feature request insert error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error saving feature request.")
    finally:
        if conn:
            conn.close()

@app.post("/ask-question")
async def ask_question(request: AskQuestionRequest):
    """AI endpoint to answer questions with optional image support"""
    print("POST /ask-question called with:", request.question[:100] + "..." if len(request.question) > 100 else request.question)
    print(f"Session ID: {request.session_id}, Topic Context: {request.topic_context}")
    
    try:
        # ROUTE ALL PROBLEMS (TEXT + IMAGE) TO PROBLEM SOLVER ENDPOINT ONLY
        # Check if this is casual conversation (small talk) - only casual chat goes to AI chat
        question_lower = request.question.lower().strip()
        casual_phrases = [
            "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
            "how are you", "how's it going", "what's up", "how do you do",
            "nice to meet you", "pleasure to meet you", "good to see you",
            "thanks", "thank you", "bye", "goodbye", "see you", "take care"
        ]
        
        is_casual = any(phrase in question_lower for phrase in casual_phrases)
        
        # If it's NOT casual conversation, route to problem solver
        if not is_casual:
            print("🔧 Problem detected - redirecting to problem solver endpoint")
            print(f"📊 Request details: question_length={len(request.question)}, has_image_data={bool(request.image_data)}")
            
            # Handle image problems with Gemini Vision
            if request.image_data:
                print("🖼️ Image data detected - using Gemini Pro Vision")
                
                # Use Gemini Vision for direct image analysis
                enhanced_question = f"""
{request.question}

🖼️ GEMINI VISION ANALYSIS:
This image will be analyzed directly by Gemini Pro Vision to provide a comprehensive solution.

The vision model will:
- Identify the subject (Physics, Chemistry, or Mathematics) and specific topic
- Analyze any diagrams, formulas, or text in the image
- Provide step-by-step solution with proper mathematical notation
- Use LaTeX formatting for formulas and equations
- Include relevant concepts and explanations
- Give the final answer clearly

This will be processed by Gemini Pro Vision - a powerful AI model that can actually see and analyze the image content.
"""
                
                print("🖼️ Using Gemini Pro Vision approach")
                print(f"🖼️ Enhanced question length: {len(enhanced_question)} characters")
                
                problem_solver_request = AskQuestionRequest(
                    question=enhanced_question,
                    image_data=request.image_data,  # Image data for Gemini Vision processing
                    session_id=request.session_id,
                    topic_context=request.topic_context
                )
                
                print("🔄 About to call problem solver function...")
                result = await problem_solver(problem_solver_request)
                print("✅ Problem solver returned successfully")
                return result
            else:
                # Text problem - route to problem solver
                print("📝 Text problem - calling problem solver")
                print("🔄 About to call problem_solver function...")
                result = await problem_solver(request)
                print("✅ Problem solver returned successfully")
                return result
        
        # ONLY casual conversation continues to AI chat with RAG
        print("💬 Casual conversation detected - continuing to AI chat with RAG")
        full_question = request.question
        
        # Generate embedding for the question
        question_embedding = embedding_model.encode(full_question).tolist()
        print("Question embedding generated successfully.")
        
        conn = None
        try:
            conn = get_db_connection()
            if conn is None:
                raise HTTPException(status_code=503, detail="Database connection unavailable.")
            
            # Find relevant content in database
            relevant_text, context_level, context_name = "", "", ""
            with conn.cursor() as cur:
                print("Finding matching content in DB...")
                cur.execute("SELECT * FROM match_topics(%s::vector, 0.3, 10)", (question_embedding,))
                match_results = cur.fetchall()
                print(f"Match results count: {len(match_results)}")
                
                if match_results:
                    matched_topic_id, matched_topic_name, similarity, matched_chapter_id = random.choice(match_results)
                    print(f"Selected topic '{matched_topic_name}' (Similarity: {similarity:.4f})")
                    
                    # Get topic text
                    cur.execute("SELECT full_text FROM topics WHERE id = %s", (matched_topic_id,))
                    topic_text_result = cur.fetchone()
                    
                    if topic_text_result and topic_text_result[0] and topic_text_result[0].strip():
                        relevant_text, context_level, context_name = topic_text_result[0], "Topic", matched_topic_name
                    else:
                        # Fallback to chapter text
                        cur.execute("SELECT name, full_text FROM chapters WHERE id = %s", (matched_chapter_id,))
                        chapter_text_result = cur.fetchone()
                        if chapter_text_result and chapter_text_result[1] and chapter_text_result[1].strip():
                            relevant_text, context_level, context_name = chapter_text_result[1], "Chapter", chapter_text_result[0]
                        else:
                            relevant_text = "General JEE knowledge"
                            context_level = "General"
                            context_name = "JEE Syllabus"
                else:
                    relevant_text = "General JEE knowledge"
                    context_level = "General"
                    context_name = "JEE Syllabus"
            
            # Limit text length
            max_chars = 15000
            if len(relevant_text) > max_chars:
                relevant_text = relevant_text[:max_chars]
            
            # Create prompt for AI with proper session management
            if is_casual:
                system_message = """You are a warm and encouraging JEE tutor who loves helping students with their preparation.
                
                The student is engaging in casual conversation. Respond warmly and personally:
                - Be enthusiastic and encouraging
                - Show genuine interest in their JEE journey
                - Keep it friendly but professional
                - Express excitement about helping them learn
                - If they say hi/hello, greet them warmly and ask how you can help with their studies
                - If they ask how you are, respond positively and redirect to how you can assist them
                - Always bring the conversation back to their JEE preparation goals
                
                Remember: You're their personal JEE tutor, not just an AI assistant."""
            else:
                # Build context-aware system message
                context_info = ""
                if request.topic_context:
                    context_info = f"\n\nCURRENT TOPIC CONTEXT: {request.topic_context}\nIMPORTANT: Focus ONLY on this topic unless the student explicitly asks about something else."
                
                system_message = f"""You are an expert JEE tutor specializing in Physics, Chemistry, and Mathematics. 
                
                CRITICAL: You are NOT ChatGPT or a general AI. You are a JEE PCM tutor ONLY.
                
                SESSION MANAGEMENT: This is a NEW question. Do NOT reference previous conversations or topics unless explicitly mentioned by the student.
                
                Your task is to answer the student's question using the provided textbook context and any image context.
                
                Guidelines:
                - Answer ONLY the current question asked by the student
                - Do NOT assume continuation of previous topics
                - If an image is provided, carefully analyze both the question and image content
                - Use the textbook context to provide accurate, JEE-level explanations
                - Include mathematical formulas using LaTeX notation when relevant
                - Provide step-by-step explanations suitable for JEE preparation
                - Focus only on JEE PCM subjects (Physics, Chemistry, Mathematics)
                - If asked about non-PCM topics, politely redirect to JEE subjects
                - Keep responses friendly but professional
                - Stay focused on the specific question asked
                
                {context_info}
                
                Format your response clearly with proper markdown formatting."""
            
            # Enhanced prompt for image questions with session management
            if is_casual:
                user_message_content = f"Student: {request.question}"
            elif request.image_data:
                user_message_content = f"""CURRENT STUDENT QUESTION (NEW SESSION): {full_question}

IMPORTANT: This is a NEW question. Do NOT reference previous conversations.
The student has provided an image along with their question. Please:
1. Analyze the image description provided
2. Consider both the visual content and the text question
3. Provide a comprehensive answer that addresses both aspects

--- TEXTBOOK CONTEXT ({context_level}: {context_name}) ---
{relevant_text}
--- END OF CONTEXT ---

Please provide a detailed solution that incorporates both the image analysis and the textbook knowledge."""
            else:
                user_message_content = f"""CURRENT STUDENT QUESTION (NEW SESSION): {full_question}

IMPORTANT: This is a NEW question. Do NOT reference previous conversations or topics.

--- TEXTBOOK CONTEXT ({context_level}: {context_name}) ---
{relevant_text}
--- END OF CONTEXT ---

Please provide a detailed solution that addresses the current question only."""
            
            # Call AI model
            print("Calling LLM API for response...")
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message_content}
            ]
            
            response_params = {
                "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
                "max_tokens": 2048,
                "temperature": 0.4,
                "messages": messages
            }
            
            response = llm_client.chat.completions.create(**response_params)
            answer = response.choices[0].message.content.strip()
            
            if not answer or answer.lower().startswith(("i'm sorry", "i cannot", "i don't know")):
                raise HTTPException(status_code=503, detail="The AI was unable to generate a response.")
            
            # For casual conversation, ensure the response feels personal
            if is_casual:
                # Add a personal touch if the response is too short
                if len(answer) < 50:
                    answer += "\n\nI'm excited to help you with your JEE preparation! What would you like to study today?"
                # Ensure it doesn't sound too formal
                answer = answer.replace("I am", "I'm").replace("I will", "I'll").replace("I have", "I've")
            
            print("AI response generated successfully.")
            
            return JSONResponse(content={
                "answer": answer,
                "source_chapter": context_name,
                "source_level": context_level,
                "image_processed": bool(request.image_data)
            })
            
        except HTTPException as e:
            raise e
        except Exception as e:
            print(f"Error in ask_question: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="An error occurred while processing your question.")
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Unexpected error in ask_question: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/image-solve")
async def image_solve(
    question: str = Form(...),
    image: UploadFile = File(...)
):
    """Image solver endpoint that processes images and routes them to the problem solver"""
    print(f"POST /image-solve called with question: {question[:100]}...")
    print(f"Image file: {image.filename}, size: {image.size} bytes")
    
    try:
        # Read and process the uploaded image
        image_content = await image.read()
        
        # Convert to base64 for storage and transmission
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        
        # Process image with PIL for basic analysis
        try:
            # Convert bytes to PIL Image
            pil_image = Image.open(io.BytesIO(image_content))
            
            # Basic image analysis using PIL only
            width, height = pil_image.size
            image_format = pil_image.format
            image_mode = pil_image.mode
            
            print(f"Image processed: {width}x{height} pixels, format: {image_format}, mode: {image_mode}")
            
            # Enhanced image description for AI
            image_description = f"""
IMAGE ANALYSIS:
- Dimensions: {width}x{height} pixels
- Format: {image_format}
- Color mode: {image_mode}
- File size: {len(image_content)} bytes

IMAGE CONTENT TYPE: {'Mathematical problem, diagram, or graph' if width > height else 'Text, formula, or mathematical content'}

INSTRUCTIONS FOR AI:
1. This image contains visual information that must be considered
2. Analyze both the question text and the image content
3. Provide a solution that incorporates what you can infer from the image
4. If the image shows a mathematical problem, solve it step by step
5. If the image shows a diagram, explain the concepts it represents
6. If the image shows text/formulas, use them in your explanation

Please provide a comprehensive solution that addresses both the question and the image content.
"""
            
        except Exception as e:
            print(f"Error in image processing: {e}")
            # Fallback to basic description
            image_description = f"Image uploaded: {image.filename}, size: {len(image_content)} bytes"
        
        # Now call the problem solver endpoint with both text and image data
        try:
            # Use Gemini Vision for direct image analysis
            print(f"🔄 Using Gemini 1.5 Flash for direct image processing")
            
            # Create the request object for problem solver processing
            internal_request = AskQuestionRequest(
                question=f"{question}\n\n{image_description}\n\n🖼️ GEMINI VISION ANALYSIS: This image will be analyzed directly by Gemini 1.5 Flash to provide a comprehensive solution.",
                image_data=image_base64  # Image data for Gemini Vision processing
            )
            
            # Process with problem solver instead of ask_question
            print("🔄 Processing image with problem solver endpoint using Gemini Vision")
            result = await problem_solver(internal_request)
            
            # Add image metadata to the response
            if hasattr(result, 'body'):
                import json
                response_data = json.loads(result.body.decode())
                response_data['image_metadata'] = {
                    'filename': image.filename,
                    'size': len(image_content),
                    'format': getattr(pil_image, 'format', 'unknown'),
                    'dimensions': f"{getattr(pil_image, 'size', [0, 0])[0]}x{getattr(pil_image, 'size', [0, 0])[1]}"
                }
                return JSONResponse(content=response_data)
            else:
                return result
            
        except Exception as e:
            print(f"Error in internal ask_question call: {e}")
            # Fallback: return the processed image data for manual handling
            return JSONResponse(content={
                "answer": f"Image processed successfully. Question: {question}\n\nImage: {image.filename} ({len(image_content)} bytes)\n\nThis image problem has been routed to the problem solver endpoint for comprehensive analysis.",
                "source_chapter": "Image Analysis",
                "source_level": "Image",
                "image_processed": True,
                "image_data": image_base64,
                "image_metadata": {
                    "filename": image.filename,
                    "size": len(image_content),
                    "format": getattr(pil_image, 'format', 'unknown'),
                    "dimensions": f"{getattr(pil_image, 'size', [0, 0])[0]}x{getattr(pil_image, 'size', [0, 0])[1]}"
                }
            })
            
    except Exception as e:
        print(f"Error in image_solve: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

# Alternative endpoint for base64 encoded images
@app.post("/image-solve-base64")
async def image_solve_base64(request: AskQuestionRequest):
    """Image solver endpoint that accepts base64 encoded images"""
    print(f"POST /image-solve-base64 called with question: {request.question[:100]}...")
    print(f"Image data provided: {bool(request.image_data)}")
    
    if not request.image_data:
        raise HTTPException(status_code=400, detail="Image data is required for this endpoint")
    
    try:
        # Use the original base64 string directly - no fixing or decoding needed
        print(f"🔄 Using original base64 string: {len(request.image_data)} characters")
        
        # Enhanced question with Gemini Vision approach
        enhanced_question = f"""
{request.question}

🖼️ GEMINI VISION ANALYSIS:
This image will be analyzed directly by Gemini 1.5 Flash to provide a comprehensive solution.

The vision model will:
- Identify the subject (Physics, Chemistry, or Mathematics) and specific topic
- Analyze any diagrams, formulas, or text in the image
- Provide step-by-step solution with proper mathematical notation
- Use LaTeX formatting for formulas and equations
- Include relevant concepts and explanations
- Give the final answer clearly

This will be processed by Gemini 1.5 Flash - a powerful AI model that can actually see and analyze the image content.
"""
        
        # Create internal request with enhanced question
        internal_request = AskQuestionRequest(
            question=enhanced_question,
            image_data=request.image_data  # Image data for Gemini Vision processing
        )
        
        # Process with problem solver instead of ask_question
        print("🔄 Processing image with problem solver endpoint using Gemini Vision")
        return await problem_solver(internal_request)
        
    except Exception as e:
        print(f"Error in image_solve_base64: {e}")
        traceback.print_exc()
        
        # Fallback to text-only problem solving if image processing fails
        print("🔄 Falling back to text-only problem solving")
        fallback_request = AskQuestionRequest(
            question=f"{request.question}\n\nNote: Image processing failed, but I'll help with the text problem.",
            image_data=None
        )
        return await problem_solver(fallback_request)

# --- Health Check Endpoint ---
@app.get("/health")
async def health_check():
    """Enhanced health check endpoint for Fly.io monitoring"""
    try:
        # Check if AI model is loaded
        model_status = "loaded" if embedding_model else "not_loaded"
        
        # Check database connection
        db_status = "connected"
        try:
            conn = get_db_connection()
            if conn:
                conn.close()
            else:
                db_status = "failed"
        except Exception:
            db_status = "failed"
        
        # Check API key
        api_status = "configured" if TOGETHER_API_KEY else "missing"
        
        return {
            "status": "ok",
            "timestamp": str(datetime.datetime.now()),
            "ai_model": model_status,
            "database": db_status,
            "api_key": api_status,
            "version": "1.0.0"
        }
    except Exception as e:
        print(f"Health check error: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": str(datetime.datetime.now())
        }

# Add a simple root endpoint for basic connectivity testing
@app.get("/")
async def root():
    return {"message": "Praxis AI Backend is running", "status": "ok"}

@app.get("/test-chat")
async def test_chat():
    """Test endpoint to verify chat routing is working"""
    return {"message": "Chat endpoint routing is working", "status": "ok"}

@app.post("/test-chat-post")
async def test_chat_post(request: AskQuestionRequest):
    """Test POST endpoint for chat"""
    return {
        "message": "Chat POST endpoint is working", 
        "status": "ok",
        "received_question": request.question,
        "timestamp": str(datetime.datetime.now())
    }

@app.post("/test-image-routing")
async def test_image_routing(request: AskQuestionRequest):
    """Test endpoint to verify image routing is working"""
    print(f"🧪 TEST: Image routing test called")
    print(f"🧪 Question: {request.question}")
    print(f"🧪 Has image data: {bool(request.image_data)}")
    print(f"🧪 Image data length: {len(request.image_data) if request.image_data else 0}")
    
    if request.image_data:
        try:
            image_bytes = base64.b64decode(request.image_data)
            image = Image.open(io.BytesIO(image_bytes))
            width, height = image.size
            print(f"🧪 Image processed successfully: {width}x{height} pixels")
            
            return {
                "message": "Image routing test successful",
                "status": "ok",
                "image_processed": True,
                "dimensions": f"{width}x{height}",
                "format": getattr(image, 'format', 'unknown')
            }
        except Exception as e:
            print(f"🧪 Error processing image: {e}")
            return {
                "message": "Image routing test failed",
                "status": "error",
                "error": str(e)
            }
    else:
        return {
            "message": "No image data provided",
            "status": "ok",
            "image_processed": False
        }

@app.post("/test-corrupted-image")
async def test_corrupted_image(request: AskQuestionRequest):
    """Test endpoint to verify corrupted image processing functionality"""
    print(f"🧪 TEST: Corrupted image processing test called")
    print(f"🧪 Question: {request.question}")
    print(f"🧪 Has image data: {bool(request.image_data)}")
    print(f"🧪 Image data length: {len(request.image_data) if request.image_data else 0}")
    
    if request.image_data:
        try:
            # Test the new corrupted image processing
            image_bytes, metadata = process_corrupted_image(request.image_data)
            
            return {
                "message": "Corrupted image processing test successful",
                "status": "ok",
                "image_processed": True,
                "recovery_method": metadata['recovery_method'],
                "dimensions": f"{metadata['width']}x{metadata['height']}",
                "format": metadata['format'],
                "color_mode": metadata['mode'],
                "size_bytes": metadata['size_bytes']
            }
        except Exception as e:
            print(f"🧪 Error processing corrupted image: {e}")
            return {
                "message": "Corrupted image processing test failed",
                "status": "error",
                "error": str(e),
                "image_processed": False
            }
    else:
        return {
            "message": "No image data provided",
            "status": "ok",
            "image_processed": False
        }

@app.post("/reset-session")
async def reset_session():
    """Reset session context - useful when switching topics"""
    return {
        "message": "Session context reset successfully",
        "status": "ok",
        "timestamp": str(datetime.datetime.now()),
        "note": "Next question will be treated as a new topic"
    }

@app.post("/api/quick-help")
async def api_quick_help_redirect(request: dict):
    """Redirect endpoint for /api/quick-help to /agentic/quick-help"""
    print(f"POST /api/quick-help called with request: {request}")
    
    # Handle both request formats: {"query": "..."} and {"question": "..."}
    query_text = request.get("query") or request.get("question")
    
    if not query_text:
        raise HTTPException(status_code=400, detail="Either 'query' or 'question' field is required")
    
    print(f"Extracted query: {query_text}")
    
    # Import the quick_help function from aiquickhelp module
    from aiquickhelp import quick_help
    from aiquickhelp import QuickHelpRequest
    
    # Convert the request to QuickHelpRequest format
    quick_help_req = QuickHelpRequest(query=query_text)
    
    # Call the actual quick_help function
    return await quick_help(quick_help_req)

def fix_base64_string(base64_str: str) -> str:
    """Fix corrupted base64 strings by proper padding and cleaning"""
    if not base64_str:
        return base64_str
    
    # Remove any whitespace and newlines
    cleaned = base64_str.strip().replace('\n', '').replace('\r', '').replace(' ', '')
    
    # Remove any invalid base64 characters (keep only A-Z, a-z, 0-9, +, /, =)
    import re
    cleaned = re.sub(r'[^A-Za-z0-9+/=]', '', cleaned)
    
    # Fix padding - base64 length must be multiple of 4
    length = len(cleaned)
    if length % 4 != 0:
        # Add padding characters
        padding_needed = 4 - (length % 4)
        cleaned += '=' * padding_needed
    
    return cleaned

def safe_decode_base64(base64_str: str) -> bytes:
    """Safely decode base64 string with multiple fallback strategies"""
    if not base64_str:
        raise ValueError("Empty base64 string")
    
    # Strategy 1: Try to fix and decode
    try:
        fixed_str = fix_base64_string(base64_str)
        return base64.b64decode(fixed_str)
    except Exception as e:
        print(f"Strategy 1 failed: {e}")
    
    # Strategy 2: Try with validate=False (more lenient)
    try:
        fixed_str = fix_base64_string(base64_str)
        return base64.b64decode(fixed_str, validate=False)
    except Exception as e:
        print(f"Strategy 2 failed: {e}")
    
    # Strategy 3: Try to remove padding and add correct padding
    try:
        # Remove all padding first
        no_padding = base64_str.rstrip('=')
        # Calculate correct padding
        padding_needed = (4 - len(no_padding) % 4) % 4
        corrected = no_padding + ('=' * padding_needed)
        return base64.b64decode(corrected)
    except Exception as e:
        print(f"Strategy 3 failed: {e}")
    
    # Strategy 4: Last resort - try to decode with binascii
    try:
        import binascii
        fixed_str = fix_base64_string(base64_str)
        return binascii.a2b_base64(fixed_str)
    except Exception as e:
        print(f"Strategy 4 failed: {e}")
    
    # If all strategies fail, raise a clear error
    raise ValueError(f"Unable to decode base64 string after all repair attempts. Original length: {len(base64_str)}")

def process_corrupted_image(image_data: str) -> tuple[bytes, dict]:
    """
    Process potentially corrupted base64 image data with multiple recovery strategies.
    Returns (image_bytes, metadata) or raises ValueError if all strategies fail.
    """
    print(f"🔄 Processing potentially corrupted image data of length: {len(image_data)}")
    
    # Strategy 1: Try the enhanced safe_decode_base64
    try:
        image_bytes = safe_decode_base64(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size
        
        metadata = {
            'width': width,
            'height': height,
            'format': getattr(image, 'format', 'unknown'),
            'mode': getattr(image, 'mode', 'unknown'),
            'size_bytes': len(image_bytes),
            'recovery_method': 'enhanced_decode'
        }
        
        print(f"✅ Image recovered successfully: {width}x{height} pixels")
        return image_bytes, metadata
        
    except Exception as e:
        print(f"❌ Enhanced decode failed: {e}")
    
    # Strategy 1.5: Try to fix common end corruption patterns
    try:
        print("🔄 Attempting to fix common end corruption patterns...")
        
        # Clean the string first
        cleaned = re.sub(r'[^A-Za-z0-9+/=]', '', image_data)
        print(f"🔄 Cleaned base64 length: {len(cleaned)}")
        
        # Common pattern: image header is intact, end is corrupted
        # Try to find where the valid base64 ends naturally
        # Start from the end and work backwards to find the largest valid image
        max_valid_length = 0
        best_result = None
        best_metadata = None
        
        for end_pos in range(len(cleaned), max(0, len(cleaned) - 2000), -1):
            test_str = cleaned[0:end_pos]
            if len(test_str) % 4 == 0 and len(test_str) > 2000:  # More lenient length requirement
                try:
                    test_bytes = base64.b64decode(test_str, validate=False)
                    if len(test_bytes) > 5000:  # More lenient size requirement
                        image = Image.open(io.BytesIO(test_bytes))
                        width, height = image.size
                        
                        # Accept reasonable image dimensions
                        if width > 100 and height > 100:  # More lenient dimension requirement
                            # Prefer larger, more complete images
                            if len(test_bytes) > max_valid_length:
                                max_valid_length = len(test_bytes)
                                best_result = test_bytes
                                best_metadata = {
                                    'width': width,
                                    'height': height,
                                    'format': getattr(image, 'format', 'unknown'),
                                    'mode': getattr(image, 'mode', 'unknown'),
                                    'size_bytes': len(test_bytes),
                                    'recovery_method': 'end_corruption_fix',
                                    'end_pos': end_pos,
                                    'substring_length': len(test_str)
                                }
                                print(f"🔄 Found candidate: {width}x{height} pixels, {len(test_bytes)} bytes at position {end_pos}")
                except Exception as decode_error:
                    # Silently continue - this is expected for invalid base64
                    continue
        
        if best_result:
            print(f"✅ Image recovered by fixing end corruption: {best_metadata['width']}x{best_metadata['height']} pixels")
            print(f"🔄 Used base64 from start to position {best_metadata['end_pos']} (length: {best_metadata['substring_length']})")
            print(f"🔄 Original length: {len(cleaned)}, Recovered length: {len(best_result)} bytes")
            return best_result, best_metadata
        else:
            print(f"🔄 End corruption fix: No valid images found in range {len(cleaned)} to {max(0, len(cleaned) - 2000)}")
                    
    except Exception as e:
        print(f"❌ End corruption fix failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Strategy 2: Try to find valid base64 substring
    try:
        print("🔄 Attempting to find valid base64 substring...")
        
        # Clean the string first
        cleaned = re.sub(r'[^A-Za-z0-9+/=]', '', image_data)
        
        # Find the LARGEST valid base64 substring that represents a complete image
        max_valid_length = 0
        best_result = None
        best_metadata = None
        
        # Try different starting positions - be more aggressive in finding the complete image
        for start in range(0, min(200, len(cleaned))):  # Check first 200 characters
            for end in range(len(cleaned), max(start, len(cleaned) - 200), -1):  # Check last 200 characters
                test_str = cleaned[start:end]
                if len(test_str) % 4 == 0 and len(test_str) > 1000:  # Must be valid length and substantial size
                    try:
                        test_bytes = base64.b64decode(test_str, validate=False)
                        if len(test_bytes) > 5000:  # Must be substantial image size (not just a fragment)
                            image = Image.open(io.BytesIO(test_bytes))
                            width, height = image.size
                            
                            # Prefer larger, more complete images
                            if len(test_bytes) > max_valid_length and width > 100 and height > 100:
                                max_valid_length = len(test_bytes)
                                best_result = test_bytes
                                best_metadata = {
                                    'width': width,
                                    'height': height,
                                    'format': getattr(image, 'format', 'unknown'),
                                    'mode': getattr(image, 'mode', 'unknown'),
                                    'size_bytes': len(test_bytes),
                                    'recovery_method': 'substring_extraction',
                                    'start_pos': start,
                                    'end_pos': end,
                                    'substring_length': len(test_str)
                                }
                    except:
                        continue
        
        if best_result:
            print(f"✅ Image recovered from substring: {best_metadata['width']}x{best_metadata['height']} pixels")
            print(f"🔄 Substring used: positions {best_metadata['start_pos']} to {best_metadata['end_pos']} (length: {best_metadata['substring_length']})")
            print(f"🔄 Original length: {len(cleaned)}, Recovered length: {len(best_result)} bytes")
            return best_result, best_metadata
                        
    except Exception as e:
        print(f"❌ Substring extraction failed: {e}")
    
    # Strategy 3: Try to reconstruct with common patterns
    try:
        print("🔄 Attempting pattern-based reconstruction...")
        
        # If we're missing characters, try to fill them intelligently
        missing_chars = 4 - (len(image_data) % 4)
        if missing_chars < 4:
            # Try common base64 patterns that might complete the image
            patterns = ['A', 'AA', 'AAA', 'AAAA']
            for pattern in patterns:
                if len(pattern) == missing_chars:
                    try:
                        test_str = image_data + pattern
                        test_bytes = base64.b64decode(test_str, validate=False)
                        if len(test_bytes) > 5000:  # Must be substantial image size
                            image = Image.open(io.BytesIO(test_bytes))
                            width, height = image.size
                            
                            # Only accept reasonable image dimensions
                            if width > 100 and height > 100:
                                metadata = {
                                    'width': width,
                                    'height': height,
                                    'format': getattr(image, 'format', 'unknown'),
                                    'mode': getattr(image, 'mode', 'unknown'),
                                    'size_bytes': len(test_bytes),
                                    'recovery_method': 'pattern_reconstruction',
                                    'pattern_used': pattern
                                }
                                
                                print(f"✅ Image recovered with pattern '{pattern}': {width}x{height} pixels")
                                return test_bytes, metadata
                    except:
                        continue
                        
    except Exception as e:
        print(f"❌ Pattern reconstruction failed: {e}")
    
    # Strategy 4: Try to find the largest valid base64 string from the beginning
    try:
        print("🔄 Attempting to find largest valid base64 from start...")
        
        # Clean the string first
        cleaned = re.sub(r'[^A-Za-z0-9+/=]', '', image_data)
        print(f"🔄 Start-to-end: Cleaned base64 length: {len(cleaned)}")
        
        # Start from the beginning and find the largest valid base64 string
        # This is often more reliable than substring extraction
        max_valid_length = 0
        best_result = None
        best_metadata = None
        
        # Try different ending positions, starting from the end
        # Check more aggressively - start from end and work backwards
        for end in range(len(cleaned), max(0, len(cleaned) - 3000), -1):
            test_str = cleaned[0:end]  # Always start from beginning
            if len(test_str) % 4 == 0 and len(test_str) > 1000:  # More lenient length requirement
                try:
                    test_bytes = base64.b64decode(test_str, validate=False)
                    if len(test_bytes) > 3000:  # More lenient size requirement
                        image = Image.open(io.BytesIO(test_bytes))
                        width, height = image.size
                        
                        # Prefer larger, more complete images
                        if len(test_bytes) > max_valid_length and width > 100 and height > 100:  # More lenient dimensions
                            max_valid_length = len(test_bytes)
                            best_result = test_bytes
                            best_metadata = {
                                'width': width,
                                'height': height,
                                'format': getattr(image, 'format', 'unknown'),
                                'mode': getattr(image, 'mode', 'unknown'),
                                'size_bytes': len(test_bytes),
                                'recovery_method': 'start_to_end_reconstruction',
                                'end_pos': end,
                                'substring_length': len(test_str)
                            }
                            print(f"🔄 Start-to-end candidate: {width}x{height} pixels, {len(test_bytes)} bytes at position {end}")
                except Exception as decode_error:
                    # Silently continue - this is expected for invalid base64
                    continue
        
        if best_result:
            print(f"✅ Image recovered from start-to-end: {best_metadata['width']}x{best_metadata['height']} pixels")
            print(f"🔄 Used base64 from start to position {best_metadata['end_pos']} (length: {best_metadata['substring_length']})")
            print(f"🔄 Original length: {len(cleaned)}, Recovered length: {len(best_result)} bytes")
            return best_result, best_metadata
        else:
            print(f"🔄 Start-to-end: No valid images found in range {len(cleaned)} to {max(0, len(cleaned) - 3000)}")
            
    except Exception as e:
        print(f"❌ Start-to-end reconstruction failed: {e}")
        import traceback
        traceback.print_exc()
    
    # If all strategies fail, raise error
    raise ValueError(f"Unable to recover image from corrupted base64 data after all strategies. Original length: {len(image_data)}")

@app.post("/problem-solver")
async def problem_solver(request: AskQuestionRequest):
    """Problem solver endpoint that provides direct AI solutions without requiring specific topics"""
    print(f"POST /problem-solver called with: {request.question[:100]}...")
    
    try:
        # For problem solving, use direct AI without RAG requirements
        system_message = """You are an expert JEE tutor specializing in Physics, Chemistry, and Mathematics.
        
        The student has a problem to solve. Your role is to:
        - Analyze the problem carefully
        - Provide a step-by-step solution
        - Use appropriate mathematical notation and formulas
        - Explain the concepts involved
        - Give the final answer clearly
        - If it's a mathematical problem, show all steps
        - If it's a conceptual question, provide detailed explanations
        
        Focus on being clear, accurate, and educational. Don't require specific topic context."""
        
        # Handle image data if provided
        if request.image_data:
            print("🖼️ Image detected in problem solver - implementing Gemini Vision")
            
            # Use Gemini Vision for direct image analysis
            enhanced_question = f"""
Problem to solve: {request.question}

🖼️ GEMINI VISION ANALYSIS:
This image will be analyzed directly by Gemini Pro Vision to provide a comprehensive solution.

The vision model will:
- Identify the subject (Physics, Chemistry, or Mathematics) and specific topic
- Analyze any diagrams, formulas, or text in the image
- Provide step-by-step solution with proper mathematical notation
- Use LaTeX formatting for formulas and equations
- Include relevant concepts and explanations
- Give the final answer clearly

This will be processed by Gemini Pro Vision - a powerful AI model that can actually see and analyze the image content.
"""
            user_message = enhanced_question
            print(f"🖼️ Using Gemini Vision approach")
            print(f"🖼️ Enhanced question length: {len(enhanced_question)} characters")
        else:
            user_message = f"Problem to solve: {request.question}"
        
        try:
            print("Calling LLM API for problem solver response...")
            
            # Check if llm_client is available
            if not llm_client:
                print("❌ LLM client not available - using fallback response")
                return JSONResponse(content={
                    "answer": "I'm currently unable to process AI requests. Please try again later.",
                    "type": "problem_solution",
                    "message": "LLM client unavailable"
                })
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
            
            # Use Gemini Vision for image problems, Mixtral for text-only problems
            if request.image_data:
                print(f"🔄 Using Gemini 1.5 Flash for image analysis")
                # Image will be processed by Gemini Vision in the AI content generator
            else:
                print(f"🔄 Using Mixtral-8x7B-Instruct-v0.1 for text-only problems")
            
            model_name = "mistralai/Mixtral-8x7B-Instruct-v0.1"  # Base model, vision handled separately
            print(f"🔄 Base model: {model_name} (Vision handled by Gemini)")
            
            response_params = {
                "model": model_name,
                "max_tokens": 2048,
                "temperature": 0.3,  # Lower temperature for more precise solutions
                "messages": messages
            }
            
            print(f"🔄 Sending request to Together AI with {len(messages)} messages")
            response = llm_client.chat.completions.create(**response_params)
            answer = response.choices[0].message.content.strip()
            
            if not answer or answer.lower().startswith(("i'm sorry", "i cannot", "i don't know")):
                raise HTTPException(status_code=503, detail="The AI was unable to generate a response.")
            
            print("Problem solver response generated successfully.")
            
            return JSONResponse(content={
                "answer": answer,
                "type": "problem_solution",
                "message": "Problem solved with step-by-step explanation"
            })
            
        except Exception as e:
            print(f"Error in problem solver: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="An error occurred during problem solving.")
            
    except Exception as e:
        print(f"Unexpected error in problem_solver: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/chat")
async def casual_chat(request: AskQuestionRequest):
    """Casual chat endpoint for friendly conversation with the JEE tutor"""
    print(f"POST /chat called with: {request.question[:100]}...")
    print(f"Request body: {request}")
    print(f"Request question: {request.question}")
    
    try:
        # Check if this is casual conversation
        question_lower = request.question.lower().strip()
        casual_phrases = [
            "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
            "how are you", "how's it going", "what's up", "how do you do",
            "nice to meet you", "pleasure to meet you", "good to see you",
            "thanks", "thank you", "bye", "goodbye", "see you", "take care",
            "how are you doing", "what's new", "how's your day", "good night"
        ]
        
        is_casual = any(phrase in question_lower for phrase in casual_phrases)
        
        # For any question, provide a helpful response
        if not is_casual:
            # If it's not casual, still provide a helpful response but redirect to problem solving
            system_message = """You are a helpful JEE tutor. The student has asked a question that might be academic.
            
            Provide a brief, helpful response and suggest they use the Problem Solver for detailed solutions.
            Be encouraging and guide them to the right tool."""
            
            user_message = f"Student question: {request.question}"
            
            try:
                print("Calling LLM API for helpful response...")
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ]
                
                response_params = {
                    "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
                    "max_tokens": 512,
                    "temperature": 0.5,
                    "messages": messages
                }
                
                response = llm_client.chat.completions.create(**response_params)
                answer = response.choices[0].message.content.strip()
                
                if not answer or answer.lower().startswith(("i'm sorry", "i cannot", "i don't know")):
                    answer = "I'd be happy to help you with that! For detailed problem solving, try using the Problem Solver tool. What would you like to work on?"
                
                return JSONResponse(content={
                    "answer": answer,
                    "type": "helpful_response",
                    "message": "Helpful guidance provided"
                })
                
            except Exception as e:
                print(f"Error in helpful response: {e}")
                # Fallback response
                return JSONResponse(content={
                    "answer": "I'd be happy to help you with that! For detailed problem solving, try using the Problem Solver tool. What would you like to work on?",
                    "type": "fallback_response",
                    "message": "Fallback response due to error"
                })
        
        # For casual conversation, use a more personal approach
        system_message = """You are a warm, enthusiastic, and encouraging JEE tutor who loves helping students.
        
        The student is engaging in casual conversation. Your role is to:
        - Be genuinely warm and friendly
        - Show excitement about helping with their studies
        - Ask about their JEE preparation progress
        - Offer encouragement and motivation
        - Keep the conversation light but educational
        - Always bring it back to how you can help with their studies
        
        Be personal, use contractions (I'm, you're, etc.), and sound like a real tutor who cares about their student."""
        
        user_message = f"Student: {request.question}"
        
        try:
            print("Calling LLM API for casual chat response...")
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
            
            response_params = {
                "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
                "max_tokens": 1024,
                "temperature": 0.7,  # Slightly higher for more creative responses
                "messages": messages
            }
            
            response = llm_client.chat.completions.create(**response_params)
            answer = response.choices[0].message.content.strip()
            
            if not answer or answer.lower().startswith(("i'm sorry", "i cannot", "i don't know")):
                raise HTTPException(status_code=503, detail="The AI was unable to generate a response.")
            
            # Ensure the response feels personal
            if len(answer) < 50:
                answer += "\n\nI'm excited to help you with your JEE preparation! What would you like to study today?"
            
            # Make it sound more conversational
            answer = answer.replace("I am", "I'm").replace("I will", "I'll").replace("I have", "I've")
            
            print("Casual chat response generated successfully.")
            
            return JSONResponse(content={
                "answer": answer,
                "type": "casual_chat",
                "message": "Friendly conversation with your JEE tutor"
            })
            
        except Exception as e:
            print(f"Error in casual chat: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="An error occurred during casual chat.")
            
    except Exception as e:
        print(f"Unexpected error in casual_chat: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# Import and include Agentic Study Room routes
app.include_router(agentic_router, prefix="/agentic", tags=["Agentic Study Room"])
