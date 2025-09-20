#!/usr/bin/env python3
"""
QR payment test client
"""

import requests
import json

# Test server URL
BASE_URL = "http://localhost:8001"

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
        print(f"📤 Sending request to: {BASE_URL}/api/payment/qr/create")
        print(f"📤 Data: {json.dumps(monthly_data, indent=2)}")
        
        response = requests.post(f"{BASE_URL}/api/payment/qr/create", json=monthly_data, timeout=10)
        print(f"📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Monthly QR Payment Created:")
            print(f"   Payment ID: {data.get('payment_id')}")
            print(f"   QR Code Length: {len(data.get('qr_code', ''))}")
            print(f"   Amount: ₹{data.get('amount')}")
            print(f"   Tier: {data.get('tier')}")
            print(f"   Expires At: {data.get('expires_at')}")
            return data.get('payment_id')
        else:
            print(f"❌ Monthly Payment Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating monthly payment: {e}")
    
    return None

def test_qr_payment_status(payment_id):
    """Test QR payment status check"""
    if not payment_id:
        print("❌ No payment ID to test status")
        return
        
    print(f"\n🧪 Testing QR Payment Status for: {payment_id}")
    
    try:
        response = requests.get(f"{BASE_URL}/api/payment/qr/status/{payment_id}", timeout=10)
        print(f"📥 Status Check: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Payment Status Retrieved:")
            print(f"   QR Code: {data.get('qr_code')}")
            print(f"   Status: {data.get('status')}")
            print(f"   Message: {data.get('message')}")
        else:
            print(f"❌ Status Check Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error checking payment status: {e}")

def test_health_check():
    """Test health check endpoint"""
    print("🧪 Testing Health Check...")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"📥 Health Check: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Check Passed:")
            print(f"   Status: {data.get('status')}")
            print(f"   Service: {data.get('service')}")
            return True
        else:
            print(f"❌ Health Check Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking health: {e}")
        return False

def test_yearly_payment():
    """Test yearly payment"""
    print("\n🧪 Testing Yearly Payment...")
    
    yearly_data = {
        "user_id": "test_user_456",
        "tier": "pro_yearly",
        "amount": 999.0
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/payment/qr/create", json=yearly_data, timeout=10)
        print(f"📥 Yearly Payment Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Yearly QR Payment Created:")
            print(f"   Payment ID: {data.get('payment_id')}")
            print(f"   QR Code Length: {len(data.get('qr_code', ''))}")
            print(f"   Amount: ₹{data.get('amount')}")
            print(f"   Tier: {data.get('tier')}")
            return data.get('payment_id')
        else:
            print(f"❌ Yearly Payment Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating yearly payment: {e}")
    
    return None

if __name__ == "__main__":
    print("🚀 Starting QR Payment Client Tests...\n")
    
    # Test health check first
    if not test_health_check():
        print("❌ Server is not running. Please start the test server first:")
        print("   python test_qr_server.py")
        exit(1)
    
    print("\n" + "="*50)
    
    # Test monthly payment
    monthly_payment_id = test_qr_payment_creation()
    
    # Test yearly payment
    yearly_payment_id = test_yearly_payment()
    
    # Test status checks
    test_qr_payment_status(monthly_payment_id)
    test_qr_payment_status(yearly_payment_id)
    
    print("\n✅ QR Payment System Tests Complete!")
    print("\n📋 Summary:")
    print(f"   Monthly Payment: {'✅ PASS' if monthly_payment_id else '❌ FAIL'}")
    print(f"   Yearly Payment: {'✅ PASS' if yearly_payment_id else '❌ FAIL'}")
    print(f"   Health Check: ✅ PASS")
    
    if monthly_payment_id and yearly_payment_id:
        print("\n🎉 All tests passed! QR payment system is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")

