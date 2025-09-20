"""
PraxisAI Credit System & Pro Mode Management
Handles daily credits, Pro subscriptions, and payment integration
"""

import os
import json
import uuid
import qrcode
import base64
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import psycopg2
import psycopg2.errors
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT", "5432")

# Payment configuration
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "razorpay")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# UPI configuration
UPI_ID = os.getenv("UPI_ID", "praxisai@paytm")
MERCHANT_NAME = os.getenv("MERCHANT_NAME", "PraxisAI")

# Create router
router = APIRouter()

# Enums
class SubscriptionStatus(str, Enum):
    FREE = "free"
    PRO = "pro"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class SubscriptionTier(str, Enum):
    FREE = "free"
    PRO_MONTHLY = "pro_monthly"
    PRO_YEARLY = "pro_yearly"
    PRO_LIFETIME = "pro_lifetime"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    REFUNDED = "refunded"

# Pydantic Models
class CreditStatus(BaseModel):
    user_id: str
    credits_used: int
    credits_remaining: int
    credits_limit: int
    credits_date: str
    is_pro_user: bool

class CreditConsumptionRequest(BaseModel):
    user_id: str
    feature_name: str
    session_id: Optional[str] = None

class CreditConsumptionResponse(BaseModel):
    success: bool
    credits_remaining: int
    message: str

class ProSubscriptionResponse(BaseModel):
    user_id: str
    subscription_status: SubscriptionStatus
    subscription_tier: SubscriptionTier
    subscribed_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_pro_user: bool

class PaymentRequest(BaseModel):
    user_id: str
    amount: float
    currency: str = "INR"
    tier: str = "pro_monthly"

class PaymentResponse(BaseModel):
    payment_id: str
    qr_code: str
    upi_link: str
    amount: float
    currency: str
    expires_at: str

class PaymentVerificationRequest(BaseModel):
    payment_id: str
    transaction_id: Optional[str] = None
    webhook_data: Optional[Dict[str, Any]] = None

class PricingInfo(BaseModel):
    monthly: Dict[str, Any]
    yearly: Dict[str, Any]
    features: List[str]
    free_features: List[str]

# QR Payment Models
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
    payment_method: str = "upi"  # "razorpay" or "upi"
    payment_url: Optional[str] = None  # Razorpay payment URL if applicable

class QRPaymentVerificationRequest(BaseModel):
    """Request model for QR payment verification"""
    qr_code: str
    user_id: str

# Database connection function
def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        return None

# Credit System Functions
@router.get("/credits/status/{user_id}", response_model=CreditStatus)
async def get_credit_status(user_id: str):
    """Get user's daily credit status"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            # Try to use the database function first
            try:
                cur.execute("SELECT * FROM get_daily_credits(%s)", (user_id,))
                result = cur.fetchone()
                
                if result:
                    return CreditStatus(
                        user_id=result[0],
                        credits_used=result[1],
                        credits_remaining=result[2],
                        credits_limit=result[3],
                        credits_date=result[4].strftime("%Y-%m-%d"),
                        is_pro_user=result[5]
                    )
            except psycopg2.errors.UndefinedFunction:
                print("Database function get_daily_credits not available, using fallback SQL")
                # Fallback to direct SQL if function doesn't exist
                pass
            except Exception as func_error:
                print(f"Database function error, using fallback: {func_error}")
                # Fallback to direct SQL if function doesn't exist
                pass
            
            # Fallback: Direct SQL query
            cur.execute("""
                SELECT dc.user_id, dc.credits_used, dc.credits_limit, dc.credits_date,
                       COALESCE(ps.subscription_status = 'pro', false) as is_pro_user
                FROM daily_credits dc
                LEFT JOIN pro_subscriptions ps ON dc.user_id = ps.user_id
                WHERE dc.user_id = %s AND dc.credits_date = CURRENT_DATE
            """, (user_id,))
            result = cur.fetchone()
            
            if not result:
                # Create default credit record for new user
                cur.execute("""
                    INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
                    VALUES (%s, 0, 5, CURRENT_DATE)
                    ON CONFLICT (user_id, credits_date) DO NOTHING
                """, (user_id,))
                conn.commit()
                
                return CreditStatus(
                    user_id=user_id,
                    credits_used=0,
                    credits_remaining=5,
                    credits_limit=5,
                    credits_date=datetime.now().strftime("%Y-%m-%d"),
                    is_pro_user=False
                )
            
            credits_remaining = result[2] - result[1]  # credits_limit - credits_used
            return CreditStatus(
                user_id=result[0],
                credits_used=result[1],
                credits_remaining=credits_remaining,
                credits_limit=result[2],
                credits_date=result[3].strftime("%Y-%m-%d"),
                is_pro_user=result[4]
            )
    except Exception as e:
        print(f"Error getting credit status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get credit status")
    finally:
        conn.close()

@router.post("/credits/consume", response_model=CreditConsumptionResponse)
async def consume_credit(request: CreditConsumptionRequest):
    """Consume a credit for a Pro feature"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM consume_credit(%s, %s, %s)
            """, (request.user_id, request.feature_name, request.session_id))
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=500, detail="Failed to process credit consumption")
            
            return CreditConsumptionResponse(
                success=result[0],
                credits_remaining=result[1],
                message=result[2]
            )
    except Exception as e:
        print(f"Error consuming credit: {e}")
        raise HTTPException(status_code=500, detail="Failed to consume credit")
    finally:
        conn.close()

# Pro Subscription Functions
@router.get("/subscription/{user_id}", response_model=ProSubscriptionResponse)
async def get_subscription_status(user_id: str):
    """Get user's Pro subscription status"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    user_id,
                    subscription_status,
                    subscription_tier,
                    subscribed_at,
                    expires_at,
                    (subscription_status = 'pro') as is_pro_user
                FROM pro_subscriptions 
                WHERE user_id = %s
            """, (user_id,))
            result = cur.fetchone()
            
            if not result:
                # Return free user status
                return ProSubscriptionResponse(
                    user_id=user_id,
                    subscription_status=SubscriptionStatus.FREE,
                    subscription_tier=SubscriptionTier.FREE,
                    is_pro_user=False
                )
            
            return ProSubscriptionResponse(
                user_id=result[0],
                subscription_status=SubscriptionStatus(result[1]),
                subscription_tier=SubscriptionTier(result[2]),
                subscribed_at=result[3].isoformat() if result[3] else None,
                expires_at=result[4].isoformat() if result[4] else None,
                is_pro_user=result[5]
            )
    except Exception as e:
        print(f"Error getting subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")
    finally:
        conn.close()

# Payment Functions
@router.post("/payment/create", response_model=PaymentResponse)
async def create_payment(request: PaymentRequest):
    """Create a payment transaction and generate QR code"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM create_payment_transaction(%s, %s, %s)
            """, (request.user_id, request.amount, request.currency))
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create payment")
            
            payment_id, qr_code, upi_link, expires_at = result
            
            # Generate QR code image
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(qr_code)
            qr.make(fit=True)
            
            # Create QR code image
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            import io
            buffer = io.BytesIO()
            qr_img.save(buffer, format='PNG')
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return PaymentResponse(
                payment_id=payment_id,
                qr_code=qr_base64,
                upi_link=upi_link,
                amount=request.amount,
                currency=request.currency,
                expires_at=expires_at.isoformat()
            )
    except Exception as e:
        print(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment")
    finally:
        conn.close()

@router.post("/payment/verify")
async def verify_payment(request: PaymentVerificationRequest):
    """Verify payment and upgrade user to Pro"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            # Get payment details
            cur.execute("""
                SELECT user_id, amount, currency, payment_status
                FROM payment_transactions 
                WHERE payment_id = %s
            """, (request.payment_id,))
            payment = cur.fetchone()
            
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")
            
            user_id, amount, currency, status = payment
            
            if status == "completed":
                return {"success": True, "message": "Payment already processed"}
            
            # Upgrade user to Pro
            cur.execute("""
                SELECT * FROM upgrade_to_pro(%s, %s, %s, %s)
            """, (user_id, request.payment_id, amount, currency))
            result = cur.fetchone()
            
            if not result or not result[0]:
                raise HTTPException(status_code=500, detail="Failed to upgrade user")
            
            return {"success": True, "message": "Successfully upgraded to Pro"}
    except Exception as e:
        print(f"Error verifying payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")
    finally:
        conn.close()

@router.get("/payment/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Get payment status"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT payment_status, amount, currency, created_at, expires_at, transaction_id
                FROM payment_transactions 
                WHERE payment_id = %s
            """, (payment_id,))
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Payment not found")
            
            return {
                "payment_id": payment_id,
                "status": result[0],
                "amount": float(result[1]),
                "currency": result[2],
                "created_at": result[3].isoformat(),
                "expires_at": result[4].isoformat(),
                "transaction_id": result[5]
            }
    except Exception as e:
        print(f"Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")
    finally:
        conn.close()

# Pricing and Features
@router.get("/pricing", response_model=PricingInfo)
async def get_pricing_info():
    """Get pricing information and feature lists"""
    return PricingInfo(
        monthly={
            "price": 99,
            "currency": "INR",
            "features": [
                "Unlimited Deep Study Mode",
                "Unlimited Study Plan Generator", 
                "Unlimited Problem Generator",
                "Unlimited Pro AI Chat",
                "Priority Support"
            ]
        },
        yearly={
            "price": 999,
            "currency": "INR", 
            "features": [
                "Everything in Monthly",
                "2 months free",
                "Priority Support",
                "Advanced Analytics"
            ],
            "discount": "17% off"
        },
        features=[
            "Deep Study Mode - Advanced AI tutoring with context memory",
            "Study Plan Generator - AI-powered personalized study plans",
            "Problem Generator - AI-generated JEE practice problems",
            "Pro AI Chat - Advanced AI chat with specialized JEE knowledge"
        ],
        free_features=[
            "Syllabus Browser - Browse JEE syllabus and topics",
            "Quick Help - Quick AI help for simple questions", 
            "Standard Chat - Basic AI chat functionality",
            "Resource Browser - Browse educational resources",
            "5 Daily Pro Credits - Try Pro features for free"
        ]
    )

# Webhook endpoint for payment providers
@router.post("/webhook/payment")
async def payment_webhook(request: dict):
    """Handle payment webhook from payment provider"""
    try:
        # Verify webhook signature (implement based on your payment provider)
        # This is a simplified version - implement proper verification
        
        payment_id = request.get("payment_id")
        status = request.get("status")
        transaction_id = request.get("transaction_id")
        
        if not payment_id or status != "completed":
            return {"success": False, "message": "Invalid webhook data"}
        
        # Verify payment and upgrade user
        verification_request = PaymentVerificationRequest(
            payment_id=payment_id,
            transaction_id=transaction_id,
            webhook_data=request
        )
        
        result = await verify_payment(verification_request)
        return result
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"success": False, "message": "Webhook processing failed"}

# Utility endpoints
@router.post("/credits/reset")
async def reset_daily_credits():
    """Reset daily credits for all users (run at midnight)"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT reset_daily_credits()")
            result = cur.fetchone()
            reset_count = result[0] if result else 0
            
            return {"success": True, "reset_count": reset_count, "message": f"Reset credits for {reset_count} users"}
    except Exception as e:
        print(f"Error resetting credits: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset credits")
    finally:
        conn.close()

@router.post("/admin/upgrade-to-pro")
async def admin_upgrade_to_pro(request: dict):
    """Admin endpoint to directly upgrade user to pro (bypasses payment)"""
    user_id = request.get('user_id')
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            # Directly insert/update pro subscription
            cur.execute("""
                INSERT INTO pro_subscriptions (user_id, subscription_status, subscription_tier, subscribed_at, expires_at)
                VALUES (%s, 'pro', 'pro', NOW(), NOW() + INTERVAL '1 year')
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    subscription_status = 'pro',
                    subscription_tier = 'pro',
                    subscribed_at = NOW(),
                    expires_at = NOW() + INTERVAL '1 year',
                    updated_at = NOW()
            """, (user_id,))
            
            return {"success": True, "message": f"Successfully upgraded user {user_id} to Pro"}
    except Exception as e:
        print(f"Error upgrading user: {e}")
        raise HTTPException(status_code=500, detail="Failed to upgrade user")
    finally:
        conn.close()

@router.get("/admin/upgrade-to-pro/{user_id}")
async def admin_upgrade_to_pro_get(user_id: str):
    """Admin GET endpoint to directly upgrade user to pro (bypasses payment)"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            # Directly insert/update pro subscription
            cur.execute("""
                INSERT INTO pro_subscriptions (user_id, subscription_status, subscription_tier, subscribed_at, expires_at)
                VALUES (%s, 'pro', 'pro', NOW(), NOW() + INTERVAL '1 year')
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    subscription_status = 'pro',
                    subscription_tier = 'pro',
                    subscribed_at = NOW(),
                    expires_at = NOW() + INTERVAL '1 year',
                    updated_at = NOW()
            """, (user_id,))
            
            return {"success": True, "message": f"Successfully upgraded user {user_id} to Pro"}
    except Exception as e:
        print(f"Error upgrading user: {e}")
        raise HTTPException(status_code=500, detail="Failed to upgrade user")
    finally:
        conn.close()

@router.get("/features")
async def get_pro_features():
    """Get list of Pro features and their requirements"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT feature_name, feature_description, requires_pro, credits_required
                FROM pro_features 
                WHERE is_active = true
                ORDER BY feature_name
            """)
            features = cur.fetchall()
            
            return [
                {
                    "feature_name": f[0],
                    "feature_description": f[1],
                    "requires_pro": f[2],
                    "credits_required": f[3]
                }
                for f in features
            ]
    except Exception as e:
        print(f"Error getting features: {e}")
        raise HTTPException(status_code=500, detail="Failed to get features")
    finally:
        conn.close()

# Razorpay Integration
import razorpay
from typing import Dict, Any

class RazorpayIntegration:
    """Razorpay payment integration"""
    
    def __init__(self):
        self.key_id = os.getenv('RAZORPAY_KEY_ID')
        self.key_secret = os.getenv('RAZORPAY_KEY_SECRET')
        self.client = None
        
        if self.key_id and self.key_secret:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            print(f"✅ Razorpay client initialized with key: {self.key_id[:8]}...")
        else:
            print(f"⚠️ Razorpay keys not found. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
    
    def create_payment_link(self, amount: int, payment_id: str, user_id: str, tier: str) -> Dict[str, Any]:
        """Create Razorpay payment link"""
        try:
            if not self.client:
                return {
                    "success": False,
                    "error": "Razorpay client not initialized",
                    "fallback_qr": True
                }
            
            # Create payment link
            payment_link = self.client.payment_link.create({
                "amount": amount * 100,  # Convert to paisa
                "currency": "INR",
                "description": f"PraxisAI Pro {tier} Subscription",
                "customer": {
                    "name": f"User {user_id}",
                    "contact": "",
                    "email": ""
                },
                "notify": {
                    "sms": False,
                    "email": False
                },
                "reminder_enable": True,
                "callback_url": f"https://praxis-ai.fly.dev/payment/callback",
                "callback_method": "get"
            })
            
            print(f"✅ Razorpay payment link created: {payment_link['id']}")
            
            return {
                "success": True,
                "payment_link_id": payment_link['id'],
                "payment_url": payment_link['short_url'],
                "amount": amount,
                "currency": "INR"
            }
            
        except Exception as e:
            print(f"❌ Error creating Razorpay payment link: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback_qr": True
            }
    
    def verify_payment(self, payment_id: str) -> Dict[str, Any]:
        """Verify payment with Razorpay"""
        try:
            if not self.client:
                return {
                    "verified": False,
                    "status": "error",
                    "message": "Razorpay client not initialized"
                }
            
            payment = self.client.payment.fetch(payment_id)
            
            if payment['status'] == 'captured':
                return {
                    "verified": True,
                    "status": "completed",
                    "amount": payment['amount'] / 100,  # Convert from paisa
                    "currency": payment['currency'],
                    "transaction_id": payment['id']
                }
            else:
                return {
                    "verified": False,
                    "status": payment['status'],
                    "message": f"Payment status: {payment['status']}"
                }
                
        except Exception as e:
            print(f"❌ Error verifying Razorpay payment: {e}")
            return {
                "verified": False,
                "status": "error",
                "message": str(e)
            }

# Initialize Razorpay
razorpay_client = RazorpayIntegration()

# Payment Provider Integration
class PaymentProvider:
    """Base class for payment provider integrations"""
    
    @staticmethod
    def verify_payment(transaction_id: str, amount: float) -> dict:
        """Verify payment with payment provider"""
        # Use Razorpay for verification
        if razorpay_client.client:
            return razorpay_client.verify_payment(transaction_id)
        
        return {
            "verified": False,
            "status": "pending",
            "message": "Payment verification not available"
        }

# QR Payment Functions
def _generate_qr_code(data: str, amount: int = None) -> str:
    """Generate QR code image and return as base64 string"""
    try:
        # For ₹99 payments, use the custom 99.png image
        if amount == 99:
            print(f"🖼️ Using custom 99.png image for ₹99 payment")
            try:
                import base64
                import os
                
                # Check if 99.png exists
                qr_image_path = os.path.join(os.path.dirname(__file__), '99.png')
                if os.path.exists(qr_image_path):
                    with open(qr_image_path, 'rb') as f:
                        qr_image_data = f.read()
                        qr_base64 = base64.b64encode(qr_image_data).decode()
                    print(f"✅ Custom 99.png loaded successfully, length: {len(qr_base64)}")
                    return qr_base64
                else:
                    print(f"⚠️ Custom 99.png not found at {qr_image_path}, falling back to generated QR")
            except Exception as e:
                print(f"⚠️ Failed to load custom 99.png: {e}, falling back to generated QR")
        
        # Generate QR code dynamically for other amounts
        print(f"🔍 Attempting to import qrcode...")
        import qrcode
        print(f"✅ qrcode imported successfully")
        
        print(f"🔍 Creating QR code object...")
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=5
        )
        
        print(f"🔍 Adding data to QR code...")
        qr.add_data(data)
        qr.make(fit=True)
        
        print(f"🔍 Creating QR code image...")
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        print(f"🔍 Converting to base64...")
        # Convert to base64
        import io
        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        print(f"✅ QR code generated successfully, length: {len(qr_base64)}")
        return qr_base64
    except ImportError as e:
        print(f"❌ qrcode import failed: {e}")
        return ""
    except Exception as e:
        print(f"❌ Error generating QR code: {e}")
        import traceback
        traceback.print_exc()
        return ""

async def create_qr_payment(user_id: str, tier: SubscriptionTier, amount: float) -> QRCodePaymentResponse:
    """Create QR code payment for pro mode upgrade"""
    try:
        print(f"🔍 Creating QR payment for user: {user_id}, tier: {tier}, amount: {amount}")
        conn = get_db_connection()
        if not conn:
            print("❌ Database connection failed")
            raise HTTPException(status_code=500, detail="Database connection failed")
        print("✅ Database connection successful")
        
        with conn.cursor() as cursor:
            try:
                print("📝 Creating payment_qr_codes table...")
                # Create payment_qr_codes table if it doesn't exist
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
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("✅ Table creation successful")
                
                # Generate unique payment ID and QR code
                payment_id = f"QR_{uuid.uuid4().hex[:12].upper()}"
                qr_code = f"PAY_{payment_id}"
                print(f"🆔 Generated payment_id: {payment_id}, qr_code: {qr_code}")
                
                # Calculate expiry time (30 minutes from now)
                expires_at = datetime.now() + timedelta(minutes=30)
                print(f"⏰ Expires at: {expires_at}")
                
                # Insert payment record
                print("💾 Inserting payment record...")
                cursor.execute("""
                    INSERT INTO payment_qr_codes (qr_code, amount, tier, user_id, status, expires_at, payment_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (qr_code, amount, tier.value, user_id, 'pending', expires_at, payment_id))
                print("✅ Payment record inserted successfully")
                
            except Exception as db_error:
                print(f"❌ Database error: {db_error}")
                raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
            
            conn.commit()
            cursor.close()
            
            # Try Razorpay payment link first, fallback to UPI QR
            tier_name = "Monthly" if tier == SubscriptionTier.PRO_MONTHLY else "Yearly"
            
            # Create Razorpay payment link
            razorpay_result = razorpay_client.create_payment_link(
                amount=int(amount),
                payment_id=payment_id,
                user_id=user_id,
                tier=tier_name
            )
            
            if razorpay_result["success"]:
                print(f"✅ Razorpay payment link created: {razorpay_result['payment_url']}")
                # Use Razorpay payment link
                qr_data = razorpay_result['payment_url']
                qr_image = _generate_qr_code(qr_data, int(amount))
                payment_method = "razorpay"
            else:
                print(f"⚠️ Razorpay failed, falling back to UPI QR: {razorpay_result.get('error', 'Unknown error')}")
                # Fallback to UPI QR
                qr_data = f"upi://pay?pa=dakshmalhotra930@oksbi&pn=PraxisAI&tr={payment_id}&am={int(amount)}&cu=INR&tn=PraxisAI%20Pro%20{tier_name}%20Subscription"
                print(f"🖼️ Generating UPI QR code for: {qr_data}")
                qr_image = _generate_qr_code(qr_data, int(amount))
                payment_method = "upi"
            
            if not qr_image:
                print("⚠️ QR code generation failed, using fallback")
                # Create a simple text-based QR code as fallback
                qr_image = "data:image/svg+xml;base64," + base64.b64encode(f"""
                <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="200" fill="white"/>
                    <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="12">
                        QR Code Unavailable
                    </text>
                    <text x="100" y="120" text-anchor="middle" font-family="monospace" font-size="10">
                        Use UPI Link Instead
                    </text>
                </svg>
                """.encode()).decode()
            
            print(f"✅ QR payment created: {payment_id} for user {user_id}")
            
            return QRCodePaymentResponse(
                qr_code=qr_code,
                qr_image=qr_image,
                amount=amount,
                tier=tier.value,
                expires_at=expires_at,
                payment_id=payment_id,
                payment_method=payment_method,
                payment_url=razorpay_result.get('payment_url') if razorpay_result.get('success') else None
            )
            
    except Exception as e:
        print(f"❌ Error creating QR payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create QR payment")

async def verify_qr_payment(qr_code: str, user_id: str) -> Dict[str, Any]:
    """Verify QR code payment and upgrade subscription"""
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        with conn.cursor() as cursor:
            # Check if payment exists and is pending
            cursor.execute("""
                SELECT * FROM payment_qr_codes 
                WHERE qr_code = %s AND user_id = %s AND status = 'pending'
            """, (qr_code, user_id))
            
            payment_record = cursor.fetchone()
            
            if not payment_record:
                return {
                    "success": False,
                    "message": "Payment not found or already processed"
                }
            
            # Check if payment is expired
            if payment_record['expires_at'] < datetime.now():
                return {
                    "success": False,
                    "message": "Payment has expired"
                }
            
            # Mark payment as completed
            cursor.execute("""
                UPDATE payment_qr_codes 
                SET status = 'completed' 
                WHERE qr_code = %s
            """, (qr_code,))
            
            # Upgrade user subscription based on tier
            tier = SubscriptionTier(payment_record['tier'])
            
            # Calculate expiry date based on subscription tier
            if tier == SubscriptionTier.PRO_MONTHLY:
                expiry_interval = "1 month"
            elif tier == SubscriptionTier.PRO_YEARLY:
                expiry_interval = "1 year"
            else:
                expiry_interval = "1 year"  # Default fallback
            
            cursor.execute("""
                INSERT INTO pro_subscriptions (user_id, subscription_status, subscription_tier, subscribed_at, expires_at)
                VALUES (%s, 'pro', %s, NOW(), NOW() + INTERVAL %s)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    subscription_status = 'pro',
                    subscription_tier = %s,
                    subscribed_at = NOW(),
                    expires_at = NOW() + INTERVAL %s,
                    updated_at = NOW()
            """, (user_id, tier.value, expiry_interval, tier.value, expiry_interval))
            
            conn.commit()
            cursor.close()
            
            print(f"✅ QR payment verified and user upgraded: {user_id}")
            
            return {
                "success": True,
                "message": "Payment verified and subscription upgraded successfully"
            }
            
    except Exception as e:
        print(f"❌ Error verifying QR payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")

async def get_qr_payment_status(qr_code: str) -> Dict[str, Any]:
    """Get payment status for a QR code"""
    try:
        conn = get_db_connection()
        if not conn:
            print(f"❌ Database connection failed for QR status check: {qr_code}")
            return {
                "status": "error",
                "amount": 0,
                "tier": "",
                "expires_at": "",
                "created_at": "",
                "is_expired": True,
                "error": "Database connection failed"
            }
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT status, amount, tier, expires_at, created_at
                FROM payment_qr_codes 
                WHERE qr_code = %s
            """, (qr_code,))
            
            payment_record = cursor.fetchone()
            cursor.close()
            
            if not payment_record:
                print(f"❌ Payment not found for QR: {qr_code}")
                return {
                    "status": "not_found",
                    "amount": 0,
                    "tier": "",
                    "expires_at": "",
                    "created_at": "",
                    "is_expired": True,
                    "error": "Payment not found"
                }
            
            from datetime import datetime
            is_expired = payment_record['expires_at'] < datetime.now()
            print(f"✅ Payment status retrieved for QR {qr_code}: {payment_record['status']}")
            
            return {
                "status": payment_record['status'],
                "amount": float(payment_record['amount']),
                "tier": payment_record['tier'],
                "expires_at": payment_record['expires_at'].isoformat(),
                "created_at": payment_record['created_at'].isoformat(),
                "is_expired": is_expired
            }
            
    except Exception as e:
        print(f"❌ Error getting payment status for QR {qr_code}: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "amount": 0,
            "tier": "",
            "expires_at": "",
            "created_at": "",
            "is_expired": True,
            "error": str(e)
        }

# QR Payment API Endpoints
@router.post("/payment/qr/create")
async def create_qr_payment_endpoint(request: QRCodePaymentRequest):
    """Create QR code payment for pro mode upgrade"""
    try:
        print(f"🔍 QR Payment Endpoint called with: user_id={request.user_id}, tier={request.tier}, amount={request.amount}")
        
        # Define pricing for different tiers
        pricing = {
            SubscriptionTier.PRO_MONTHLY: 99.0,
            SubscriptionTier.PRO_YEARLY: 999.0,
        }
        
        print(f"💰 Pricing validation: tier={request.tier}, expected_amount={pricing.get(request.tier)}")
        
        # Validate amount
        expected_amount = pricing.get(request.tier)
        if not expected_amount or request.amount != expected_amount:
            print(f"❌ Amount validation failed: expected={expected_amount}, got={request.amount}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid amount for {request.tier.value}. Expected: ₹{expected_amount}"
            )
        
        print("✅ Amount validation passed, calling create_qr_payment...")
        
        # Create QR payment
        qr_payment = await create_qr_payment(
            user_id=request.user_id,
            tier=request.tier,
            amount=request.amount
        )
        
        print("✅ QR payment created successfully")
        return qr_payment
        
    except HTTPException as he:
        print(f"❌ HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error creating QR payment: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create QR payment: {str(e)}")

@router.post("/payment/qr/verify")
async def verify_qr_payment_endpoint(request: QRPaymentVerificationRequest):
    """Verify QR code payment and upgrade subscription"""
    try:
        result = await verify_qr_payment(
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
async def get_qr_payment_status_endpoint(qr_code: str):
    """Get payment status for a QR code"""
    try:
        status = await get_qr_payment_status(qr_code)
        return status
        
    except Exception as e:
        print(f"❌ Error getting payment status: {e}")
        return {
            "status": "error",
            "amount": 0,
            "tier": "",
            "expires_at": "",
            "created_at": "",
            "is_expired": True,
            "error": str(e)
        }

@router.post("/payment/webhook/{provider}")
async def payment_webhook(provider: str, request: Request):
    """Webhook endpoint for payment provider notifications"""
    try:
        print(f"🔔 Received webhook from provider: {provider}")
        
        # Get the raw request body
        body = await request.body()
        print(f"📦 Webhook payload: {body.decode()}")
        
        # Parse JSON payload
        try:
            import json
            payload = json.loads(body.decode())
        except:
            print("⚠️ Failed to parse JSON payload")
            return {"status": "error", "message": "Invalid JSON payload"}
        
        # Extract payment information based on provider
        if provider.lower() == "razorpay":
            return await _handle_razorpay_webhook(payload)
        elif provider.lower() == "payu":
            return await _handle_payu_webhook(payload)
        elif provider.lower() == "upi":
            return await _handle_upi_webhook(payload)
        else:
            print(f"⚠️ Unknown payment provider: {provider}")
            return {"status": "error", "message": "Unknown payment provider"}
            
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

async def _handle_razorpay_webhook(payload: dict) -> dict:
    """Handle Razorpay webhook notifications"""
    try:
        print(f"🔍 Processing Razorpay webhook: {payload}")
        
        # Razorpay webhook payload structure
        event = payload.get("event")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        
        # Extract payment details
        payment_id = payment_entity.get("id")
        amount = payment_entity.get("amount")
        status = payment_entity.get("status")
        currency = payment_entity.get("currency")
        
        print(f"📊 Razorpay webhook details: Event={event}, Payment ID={payment_id}, Amount={amount}, Status={status}")
        
        if not payment_id or not amount:
            print("❌ Missing payment details in Razorpay webhook")
            return {"status": "error", "message": "Missing payment details"}
        
        # Convert amount from paisa to rupees
        amount_rupees = float(amount) / 100
        
        # Handle different Razorpay events
        if event == "payment.captured" and status == "captured":
            print(f"✅ Razorpay payment captured: {payment_id}, Amount: ₹{amount_rupees}")
            # Payment successful, update user subscription
            return await _process_successful_payment(payment_id, amount_rupees, "razorpay")
        elif event == "payment.failed":
            print(f"❌ Razorpay payment failed: {payment_id}")
            return {"status": "ignored", "message": "Payment failed"}
        else:
            print(f"⚠️ Razorpay event not handled: {event}, status: {status}")
            return {"status": "ignored", "message": f"Event: {event}, Status: {status}"}
            
    except Exception as e:
        print(f"❌ Error handling Razorpay webhook: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

async def _handle_payu_webhook(payload: dict) -> dict:
    """Handle PayU webhook notifications"""
    try:
        print(f"🔍 Processing PayU webhook: {payload}")
        
        # Extract payment details
        transaction_id = payload.get("transactionId")
        amount = payload.get("amount")
        status = payload.get("status")
        
        if not transaction_id or not amount:
            return {"status": "error", "message": "Missing payment details"}
        
        if status == "success":
            # Payment successful, update user subscription
            return await _process_successful_payment(transaction_id, float(amount), "payu")
        else:
            print(f"⚠️ Payment not successful, status: {status}")
            return {"status": "ignored", "message": f"Payment status: {status}"}
            
    except Exception as e:
        print(f"❌ Error handling PayU webhook: {e}")
        return {"status": "error", "message": str(e)}

async def _handle_upi_webhook(payload: dict) -> dict:
    """Handle UPI webhook notifications"""
    try:
        print(f"🔍 Processing UPI webhook: {payload}")
        
        # Extract payment details
        transaction_id = payload.get("transactionId") or payload.get("txnId")
        amount = payload.get("amount")
        status = payload.get("status") or payload.get("txnStatus")
        
        if not transaction_id or not amount:
            return {"status": "error", "message": "Missing payment details"}
        
        if status in ["success", "completed", "SUCCESS"]:
            # Payment successful, update user subscription
            return await _process_successful_payment(transaction_id, float(amount), "upi")
        else:
            print(f"⚠️ Payment not successful, status: {status}")
            return {"status": "ignored", "message": f"Payment status: {status}"}
            
    except Exception as e:
        print(f"❌ Error handling UPI webhook: {e}")
        return {"status": "error", "message": str(e)}

async def _process_successful_payment(transaction_id: str, amount: float, provider: str) -> dict:
    """Process successful payment and upgrade user subscription"""
    try:
        print(f"✅ Processing successful payment: {transaction_id}, Amount: {amount}, Provider: {provider}")
        
        # Find the payment record in database
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database connection failed"}
        
        with conn.cursor() as cursor:
            # Find payment record by transaction ID or amount
            cursor.execute("""
                SELECT * FROM payment_qr_codes 
                WHERE (payment_id = %s OR amount = %s) AND status = 'pending'
                ORDER BY created_at DESC LIMIT 1
            """, (transaction_id, amount))
            
            payment_record = cursor.fetchone()
            
            if not payment_record:
                print(f"⚠️ No matching payment record found for transaction: {transaction_id}")
                return {"status": "ignored", "message": "No matching payment record"}
            
            user_id = payment_record['user_id']
            qr_code = payment_record['qr_code']
            tier = payment_record['tier']
            
            print(f"🔍 Found payment record for user: {user_id}, tier: {tier}")
            
            # Update payment status to completed
            cursor.execute("""
                UPDATE payment_qr_codes 
                SET status = 'completed', payment_provider = %s, transaction_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE qr_code = %s
            """, (provider, transaction_id, qr_code))
            
            # Upgrade user subscription
            from datetime import datetime, timedelta
            
            # Calculate expiry date based on subscription tier
            if tier == "pro_monthly":
                expires_at = datetime.now() + timedelta(days=30)
            elif tier == "pro_yearly":
                expires_at = datetime.now() + timedelta(days=365)
            else:
                expires_at = datetime.now() + timedelta(days=30)  # Default to monthly
            
            # Update user subscription
            cursor.execute("""
                INSERT INTO user_subscriptions (user_id, subscription_tier, status, expires_at, payment_id)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    subscription_tier = EXCLUDED.subscription_tier,
                    status = EXCLUDED.status,
                    expires_at = EXCLUDED.expires_at,
                    payment_id = EXCLUDED.payment_id,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, tier, 'active', expires_at, payment_record['payment_id']))
            
            conn.commit()
            
            print(f"✅ User {user_id} successfully upgraded to {tier}")
            
            return {
                "status": "success",
                "message": "Payment processed and user upgraded successfully",
                "user_id": user_id,
                "tier": tier,
                "amount": amount
            }
            
    except Exception as e:
        print(f"❌ Error processing successful payment: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@router.post("/payment/qr/verify-manual")
async def verify_qr_payment_manual(qr_code: str, user_id: str):
    """Manual payment verification - call this after making UPI payment"""
    try:
        print(f"🔄 Manual payment verification for QR: {qr_code}, User: {user_id}")
        
        # Check if payment exists and is pending
        conn = get_db_connection()
        if not conn:
            return {
                "success": False,
                "message": "Database connection failed",
                "status": "error"
            }
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM payment_qr_codes 
                WHERE qr_code = %s AND user_id = %s AND status = 'pending'
            """, (qr_code, user_id))
            
            payment_record = cursor.fetchone()
            
            if not payment_record:
                return {
                    "success": False,
                    "message": "Payment not found or already processed",
                    "status": "not_found"
                }
            
            # Check if payment is expired
            from datetime import datetime
            if payment_record['expires_at'] < datetime.now():
                return {
                    "success": False,
                    "message": "Payment has expired",
                    "status": "expired"
                }
            
            # For manual verification, we assume payment was successful
            print(f"✅ Manual verification successful for payment: {qr_code}")
            
            # Update payment status with manual verification info
            cursor.execute("""
                UPDATE payment_qr_codes 
                SET status = 'completed', 
                    payment_provider = 'manual',
                    transaction_id = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE qr_code = %s
            """, (f"manual_{qr_code}_{int(datetime.now().timestamp())}", qr_code))
            
            # Upgrade user subscription
            tier = SubscriptionTier(payment_record['tier'])
            
            # Calculate expiry date based on subscription tier
            if tier == SubscriptionTier.PRO_MONTHLY:
                expiry_interval = "1 month"
            elif tier == SubscriptionTier.PRO_YEARLY:
                expiry_interval = "1 year"
            else:
                expiry_interval = "1 month"  # Default to monthly
            
            # Update user subscription
            cursor.execute("""
                INSERT INTO user_subscriptions (user_id, subscription_tier, status, expires_at, payment_id)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP + INTERVAL %s, %s)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    subscription_tier = EXCLUDED.subscription_tier,
                    status = EXCLUDED.status,
                    expires_at = EXCLUDED.expires_at,
                    payment_id = EXCLUDED.payment_id,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, tier.value, 'active', expiry_interval, payment_record['payment_id']))
            
            conn.commit()
        
        return {
            "success": True,
            "message": "Payment verified and subscription upgraded successfully",
            "status": "completed",
            "tier": tier.value,
            "amount": float(payment_record['amount'])
        }
        
    except Exception as e:
        print(f"❌ Error in manual payment verification: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Failed to verify payment: {str(e)}",
            "status": "error"
        }

@router.post("/payment/qr/verify-automatic")
async def verify_qr_payment_automatic(qr_code: str, user_id: str):
    """Automatic payment verification using payment provider APIs"""
    try:
        print(f"🤖 Automatic payment verification for QR: {qr_code}, User: {user_id}")
        
        # Check if payment exists and is pending
        conn = get_db_connection()
        if not conn:
            return {
                "success": False,
                "message": "Database connection failed",
                "status": "error"
            }
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM payment_qr_codes 
                WHERE qr_code = %s AND user_id = %s AND status = 'pending'
            """, (qr_code, user_id))
            
            payment_record = cursor.fetchone()
            
            if not payment_record:
                return {
                    "success": False,
                    "message": "Payment not found or already processed",
                    "status": "not_found"
                }
            
            # Check if payment is expired
            from datetime import datetime
            if payment_record['expires_at'] < datetime.now():
                return {
                    "success": False,
                    "message": "Payment has expired",
                    "status": "expired"
                }
            
            # Try to verify payment with payment providers
            payment_id = payment_record['payment_id']
            amount = payment_record['amount']
            
            # This would integrate with actual payment provider APIs
            # For now, we'll simulate checking multiple providers
            verification_result = await _verify_payment_with_providers(payment_id, amount)
            
            if verification_result['verified']:
                print(f"✅ Automatic verification successful for payment: {qr_code}")
                
                # Update payment status
                cursor.execute("""
                    UPDATE payment_qr_codes 
                    SET status = 'completed',
                        payment_provider = %s,
                        transaction_id = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE qr_code = %s
                """, (verification_result['provider'], verification_result['transaction_id'], qr_code))
                
                # Upgrade user subscription
                tier = SubscriptionTier(payment_record['tier'])
                
                # Calculate expiry date based on subscription tier
                if tier == SubscriptionTier.PRO_MONTHLY:
                    expiry_interval = "1 month"
                elif tier == SubscriptionTier.PRO_YEARLY:
                    expiry_interval = "1 year"
                else:
                    expiry_interval = "1 month"  # Default to monthly
                
                # Update user subscription
                cursor.execute("""
                    INSERT INTO user_subscriptions (user_id, subscription_tier, status, expires_at, payment_id)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP + INTERVAL %s, %s)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET 
                        subscription_tier = EXCLUDED.subscription_tier,
                        status = EXCLUDED.status,
                        expires_at = EXCLUDED.expires_at,
                        payment_id = EXCLUDED.payment_id,
                        updated_at = CURRENT_TIMESTAMP
                """, (user_id, tier.value, 'active', expiry_interval, payment_record['payment_id']))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Payment automatically verified and subscription upgraded",
                    "status": "completed",
                    "tier": tier.value,
                    "amount": float(payment_record['amount']),
                    "provider": verification_result['provider']
                }
            else:
                return {
                    "success": False,
                    "message": "Payment not yet confirmed by payment provider",
                    "status": "pending",
                    "retry_after": 30  # Retry after 30 seconds
                }
        
    except Exception as e:
        print(f"❌ Error in automatic payment verification: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Failed to verify payment: {str(e)}",
            "status": "error"
        }

async def _verify_payment_with_providers(payment_id: str, amount: float) -> dict:
    """Verify payment with multiple payment providers"""
    try:
        print(f"🔍 Verifying payment with providers: {payment_id}, Amount: {amount}")
        
        # Try Razorpay verification first
        if razorpay_client.client:
            print(f"🔄 Checking Razorpay for payment: {payment_id}")
            razorpay_result = razorpay_client.verify_payment(payment_id)
            
            if razorpay_result["verified"]:
                print(f"✅ Razorpay verification successful: {payment_id}")
                return {
                    "verified": True,
                    "provider": "razorpay",
                    "transaction_id": razorpay_result["transaction_id"],
                    "amount": razorpay_result["amount"],
                    "message": "Payment verified via Razorpay"
                }
            else:
                print(f"⚠️ Razorpay verification failed: {razorpay_result.get('message', 'Unknown error')}")
        
        # If Razorpay verification fails, return pending status
        return {
            "verified": False,
            "provider": None,
            "transaction_id": None,
            "message": "Payment not yet confirmed by payment provider"
        }
        
    except Exception as e:
        print(f"❌ Error verifying payment with providers: {e}")
        return {
            "verified": False,
            "provider": None,
            "transaction_id": None,
            "message": str(e)
        }

@router.get("/payment/qr/stream/{qr_code}")
async def stream_payment_status(qr_code: str):
    """Stream payment status updates using Server-Sent Events"""
    from fastapi.responses import StreamingResponse
    import asyncio
    import json
    
    async def event_stream():
        try:
            # Check initial status
            status = await get_qr_payment_status(qr_code)
            yield f"data: {json.dumps(status)}\n\n"
            
            # If already completed, stop streaming
            if status.get('status') == 'completed':
                return
            
            # Poll for updates every 5 seconds for up to 30 minutes
            max_attempts = 360  # 30 minutes / 5 seconds
            attempts = 0
            
            while attempts < max_attempts:
                await asyncio.sleep(5)  # Wait 5 seconds
                attempts += 1
                
                try:
                    current_status = await get_qr_payment_status(qr_code)
                    yield f"data: {json.dumps(current_status)}\n\n"
                    
                    # Stop streaming if payment is completed or expired
                    if current_status.get('status') in ['completed', 'expired']:
                        break
                        
                except Exception as e:
                    print(f"❌ Error checking payment status: {e}")
                    yield f"data: {json.dumps({'error': 'Failed to check payment status'})}\n\n"
                    break
            
            # Send final status
            final_status = await get_qr_payment_status(qr_code)
            yield f"data: {json.dumps(final_status)}\n\n"
            
        except Exception as e:
            print(f"❌ Error in payment status stream: {e}")
            yield f"data: {json.dumps({'error': 'Stream ended due to error'})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

