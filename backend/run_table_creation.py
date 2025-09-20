#!/usr/bin/env python3
"""
Run table creation on the deployed backend
"""

import requests
import json

# Backend URL
BASE_URL = "https://praxis-ai.fly.dev"

def create_table_via_api():
    """Create table using a simple API call"""
    print("🔌 Connecting to deployed backend...")
    
    # Try to create a test QR payment to trigger table creation
    test_data = {
        "user_id": "table_creation_test",
        "tier": "pro_monthly",
        "amount": 99.0
    }
    
    try:
        print("📝 Attempting to create QR payment (this will create the table)...")
        response = requests.post(f"{BASE_URL}/api/payment/qr/create", json=test_data)
        print(f"Response Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Table creation successful!")
            return True
        else:
            print("❌ Table creation failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Creating payment_qr_codes table via API...")
    success = create_table_via_api()
    if success:
        print("🎉 Table creation completed!")
    else:
        print("💥 Table creation failed!")
