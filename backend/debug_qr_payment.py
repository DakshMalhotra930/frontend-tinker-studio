#!/usr/bin/env python3
"""
Debug QR payment system
"""

import requests
import json

# Backend URL
BASE_URL = "https://praxis-ai.fly.dev"

def debug_qr_payment():
    """Debug QR payment creation with detailed error info"""
    print("🔍 Debugging QR Payment Creation...")
    
    # Test monthly payment
    monthly_data = {
        "user_id": "test_user_123",
        "tier": "pro_monthly",
        "amount": 99.0
    }
    
    try:
        print(f"📤 Sending request to: {BASE_URL}/api/payment/qr/create")
        print(f"📤 Data: {json.dumps(monthly_data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/payment/qr/create", 
            json=monthly_data,
            timeout=30
        )
        
        print(f"📥 Response Status: {response.status_code}")
        print(f"📥 Response Headers: {dict(response.headers)}")
        print(f"📥 Response Text: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ QR Payment Created Successfully!")
            print(f"   Payment ID: {data.get('payment_id')}")
            print(f"   QR Code: {data.get('qr_code')}")
            print(f"   Amount: ₹{data.get('amount')}")
            print(f"   Tier: {data.get('tier')}")
            return data.get('qr_code')
        else:
            print(f"❌ QR Payment Failed")
            try:
                error_data = response.json()
                print(f"   Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Raw Error: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    
    return None

if __name__ == "__main__":
    print("🚀 Starting QR Payment Debug...\n")
    qr_code = debug_qr_payment()
    print(f"\n🎯 Result: {'Success' if qr_code else 'Failed'}")
