#!/usr/bin/env python3
"""
Test script for QR payment system
"""

import requests
import json

# Backend URL
BASE_URL = "https://praxis-ai.fly.dev"

def test_qr_payment_creation():
    """Test QR payment creation"""
    print("🧪 Testing QR Payment Creation...")
    
    # Test monthly payment
    monthly_data = {
        "user_id": "test_user_123",
        "tier": "pro_monthly",
        "amount": 99.0
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/payment/qr/create", json=monthly_data)
        print(f"Monthly Payment Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Monthly QR Payment Created:")
            print(f"   Payment ID: {data.get('payment_id')}")
            print(f"   QR Code: {data.get('qr_code')}")
            print(f"   Amount: ₹{data.get('amount')}")
            print(f"   Tier: {data.get('tier')}")
            return data.get('qr_code')
        else:
            print(f"❌ Monthly Payment Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating monthly payment: {e}")
    
    # Test yearly payment
    yearly_data = {
        "user_id": "test_user_123",
        "tier": "pro_yearly", 
        "amount": 999.0
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/payment/qr/create", json=yearly_data)
        print(f"\nYearly Payment Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Yearly QR Payment Created:")
            print(f"   Payment ID: {data.get('payment_id')}")
            print(f"   QR Code: {data.get('qr_code')}")
            print(f"   Amount: ₹{data.get('amount')}")
            print(f"   Tier: {data.get('tier')}")
            return data.get('qr_code')
        else:
            print(f"❌ Yearly Payment Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating yearly payment: {e}")
    
    return None

def test_qr_payment_status(qr_code):
    """Test QR payment status check"""
    if not qr_code:
        print("❌ No QR code to test status")
        return
        
    print(f"\n🧪 Testing QR Payment Status for: {qr_code}")
    
    try:
        response = requests.get(f"{BASE_URL}/api/payment/qr/status/{qr_code}")
        print(f"Status Check: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Payment Status Retrieved:")
            print(f"   Status: {data.get('status')}")
            print(f"   Amount: ₹{data.get('amount')}")
            print(f"   Tier: {data.get('tier')}")
        else:
            print(f"❌ Status Check Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error checking payment status: {e}")

def test_qr_payment_verification(qr_code):
    """Test QR payment verification"""
    if not qr_code:
        print("❌ No QR code to test verification")
        return
        
    print(f"\n🧪 Testing QR Payment Verification for: {qr_code}")
    
    verify_data = {
        "qr_code": qr_code,
        "user_id": "test_user_123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/payment/qr/verify", json=verify_data)
        print(f"Verification Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Payment Verification Result:")
            print(f"   Success: {data.get('success')}")
            print(f"   Message: {data.get('message')}")
        else:
            print(f"❌ Verification Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error verifying payment: {e}")

if __name__ == "__main__":
    print("🚀 Starting QR Payment System Tests...\n")
    
    # Test QR payment creation
    qr_code = test_qr_payment_creation()
    
    # Test status check
    test_qr_payment_status(qr_code)
    
    # Test verification (this will fail since payment isn't actually made)
    test_qr_payment_verification(qr_code)
    
    print("\n✅ QR Payment System Tests Complete!")
