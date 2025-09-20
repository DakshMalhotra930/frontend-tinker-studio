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

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
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

# QR Payment Functions
def _generate_qr_code(data: str) -> str:
    """Generate QR code image and return as base64 string"""
    try:
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
            
            # Generate QR code image with UPI payment details
            # Use your actual UPI ID and proper business name
            tier_name = "Monthly" if tier == SubscriptionTier.PRO_MONTHLY else "Yearly"
            qr_data = f"upi://pay?pa=dakshmalhotra930@gmail.com@paytm&pn=PraxisAI&tr={payment_id}&am={int(amount)}&cu=INR&tn=PraxisAI%20Pro%20{tier_name}%20Subscription"
            
            print(f"🖼️ Generating QR code for: {qr_data}")
            qr_image = _generate_qr_code(qr_data)
            
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
                payment_id=payment_id
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
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT status, amount, tier, expires_at
                FROM payment_qr_codes 
                WHERE qr_code = %s
            """, (qr_code,))
            
            payment_record = cursor.fetchone()
            cursor.close()
            
            if not payment_record:
                return {"status": "not_found", "amount": 0, "tier": ""}
            
            return {
                "status": payment_record['status'],
                "amount": payment_record['amount'],
                "tier": payment_record['tier']
            }
            
    except Exception as e:
        print(f"❌ Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

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
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

