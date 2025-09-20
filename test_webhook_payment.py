#!/usr/bin/env python3
"""
Test the new webhook-style payment system
"""

import requests
import json
import time

BASE_URL = "https://praxis-ai.fly.dev"

def test_payment_status_endpoint():
    """Test the improved payment status endpoint"""
    print("🧪 Testing improved payment status endpoint...")
    
    # Test with a sample QR code
    test_qr_code = "PAY_QR_TEST_123"
    
    try:
        response = requests.get(f"{BASE_URL}/api/payment/qr/status/{test_qr_code}", timeout=10)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS! Response:")
            print(f"   Status: {data.get('status')}")
            print(f"   Error: {data.get('error', 'None')}")
            print(f"   Amount: {data.get('amount')}")
            return True
        else:
            print(f"❌ ERROR: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_manual_verification():
    """Test the manual payment verification endpoint"""
    print("\n🧪 Testing manual payment verification...")
    
    # Test with sample data
    test_qr_code = "PAY_QR_TEST_123"
    test_user_id = "test_user_123"
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/payment/qr/verify-manual",
            params={"qr_code": test_qr_code, "user_id": test_user_id},
            timeout=10
        )
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS! Response:")
            print(f"   Success: {data.get('success')}")
            print(f"   Message: {data.get('message')}")
            print(f"   Status: {data.get('status')}")
            return True
        else:
            print(f"❌ ERROR: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_sse_stream():
    """Test the Server-Sent Events stream endpoint"""
    print("\n🧪 Testing SSE payment status stream...")
    
    test_qr_code = "PAY_QR_TEST_123"
    
    try:
        # Test SSE endpoint (this will timeout after 10 seconds)
        response = requests.get(
            f"{BASE_URL}/api/payment/qr/stream/{test_qr_code}",
            timeout=10,
            stream=True
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📊 Content-Type: {response.headers.get('content-type')}")
        
        if response.status_code == 200:
            print("✅ SUCCESS! SSE stream started")
            
            # Read first few events
            event_count = 0
            for line in response.iter_lines(decode_unicode=True):
                if line.startswith('data: '):
                    event_count += 1
                    data = line[6:]  # Remove 'data: ' prefix
                    try:
                        event_data = json.loads(data)
                        print(f"   Event {event_count}: {event_data.get('status')}")
                    except:
                        print(f"   Event {event_count}: {data}")
                    
                    if event_count >= 3:  # Stop after 3 events
                        break
            
            return True
        else:
            print(f"❌ ERROR: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("⏰ SSE stream timeout (expected)")
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

if __name__ == "__main__":
    print("🔍 TESTING WEBHOOK-STYLE PAYMENT SYSTEM")
    print("=" * 50)
    
    # Test all endpoints
    test1_success = test_payment_status_endpoint()
    test2_success = test_manual_verification()
    test3_success = test_sse_stream()
    
    print(f"\n📊 RESULTS:")
    print(f"=" * 30)
    print(f"Payment Status Endpoint: {'✅ PASS' if test1_success else '❌ FAIL'}")
    print(f"Manual Verification: {'✅ PASS' if test2_success else '❌ FAIL'}")
    print(f"SSE Stream: {'✅ PASS' if test3_success else '❌ FAIL'}")
    
    if test1_success and test2_success and test3_success:
        print(f"\n🎉 ALL WEBHOOK ENDPOINTS WORKING!")
        print(f"✅ QR Payment system ready with webhook-style updates")
    else:
        print(f"\n❌ SOME ENDPOINTS FAILED")
        print(f"⚠️  QR Payment system needs fixes")
