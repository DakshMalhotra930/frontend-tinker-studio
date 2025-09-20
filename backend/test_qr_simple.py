#!/usr/bin/env python3
"""
Simple QR payment test
"""

import requests
import json

# Test the QR payment creation endpoint
url = "https://praxis-ai.fly.dev/api/payment/qr/create"
data = {
    "user_id": "test_user_123",
    "tier": "pro_monthly",
    "amount": 99.0
}

print("Testing QR payment creation...")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, indent=2)}")

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code != 200:
        print("❌ QR payment creation failed")
    else:
        print("✅ QR payment creation successful")
        
except Exception as e:
    print(f"❌ Error: {e}")
