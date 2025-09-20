#!/usr/bin/env python3
"""
Minimal QR payment test server
"""

import os
import sys
import json
import uuid
import base64
import io
from datetime import datetime, timedelta
from typing import Optional

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    from enum import Enum
    import qrcode
    from PIL import Image
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Please install: pip install fastapi uvicorn qrcode[pil]")
    sys.exit(1)

# Enums
class SubscriptionTier(str, Enum):
    PRO_MONTHLY = "pro_monthly"
    PRO_YEARLY = "pro_yearly"

# Models
class QRCodePaymentRequest(BaseModel):
    user_id: str
    tier: SubscriptionTier
    amount: float

class QRCodePaymentResponse(BaseModel):
    payment_id: str
    qr_code: str
    amount: float
    tier: str
    expires_at: str

# Create FastAPI app
app = FastAPI(title="QR Payment Test Server")

def _generate_qr_code(data: str) -> str:
    """Generate QR code image and return as base64 string"""
    try:
        print(f"🔍 Generating QR code for: {data[:50]}...")
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=5
        )
        
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        print(f"✅ QR code generated successfully, length: {len(qr_base64)}")
        return qr_base64
    except Exception as e:
        print(f"❌ Error generating QR code: {e}")
        return ""

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "qr-payment-test"}

@app.post("/api/payment/qr/create", response_model=QRCodePaymentResponse)
async def create_qr_payment(request: QRCodePaymentRequest):
    """Create QR code payment for pro mode upgrade"""
    try:
        print(f"🔍 QR Payment Request: user_id={request.user_id}, tier={request.tier}, amount={request.amount}")
        
        # Define pricing for different tiers
        pricing = {
            SubscriptionTier.PRO_MONTHLY: 99.0,
            SubscriptionTier.PRO_YEARLY: 999.0,
        }
        
        # Validate amount
        expected_amount = pricing.get(request.tier)
        if not expected_amount or request.amount != expected_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid amount for {request.tier.value}. Expected: ₹{expected_amount}"
            )
        
        # Generate unique payment ID and QR code
        payment_id = f"QR_{uuid.uuid4().hex[:12].upper()}"
        qr_code = f"PAY_{payment_id}"
        
        # Calculate expiry time (30 minutes from now)
        expires_at = datetime.now() + timedelta(minutes=30)
        
        # Generate UPI payment URL
        upi_id = "dakshmalhotra930@gmail.com@paytm"
        merchant_name = "PraxisAI"
        
        upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&tr={payment_id}&am={request.amount}&cu=INR&tn=PraxisAI {request.tier.value.replace('_', ' ').title()}"
        
        print(f"🔗 UPI URL: {upi_url}")
        
        # Generate QR code
        qr_image_base64 = _generate_qr_code(upi_url)
        
        if not qr_image_base64:
            raise HTTPException(status_code=500, detail="Failed to generate QR code")
        
        response = QRCodePaymentResponse(
            payment_id=payment_id,
            qr_code=qr_image_base64,
            amount=request.amount,
            tier=request.tier.value,
            expires_at=expires_at.isoformat()
        )
        
        print(f"✅ QR Payment created successfully: {payment_id}")
        return response
        
    except HTTPException as he:
        print(f"❌ HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create QR payment: {str(e)}")

@app.get("/api/payment/qr/status/{qr_code}")
async def get_qr_payment_status(qr_code: str):
    """Get QR payment status"""
    return {
        "qr_code": qr_code,
        "status": "pending",
        "message": "Payment is pending verification"
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting QR Payment Test Server...")
    print("📱 Test endpoints:")
    print("   POST /api/payment/qr/create")
    print("   GET  /api/payment/qr/status/{qr_code}")
    print("   GET  /health")
    print("\n🔧 To test:")
    print("   python test_qr_client.py")
    print("\n🌐 Server will be available at: http://localhost:8001")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)

