#!/usr/bin/env python3
"""
Test QR payment locally
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test the QR code generation function
from credit_system import _generate_qr_code

def test_qr_generation():
    print("🧪 Testing QR code generation locally...")
    
    test_data = "upi://pay?pa=dakshmalhotra930@gmail.com@paytm&pn=PraxisAI&tr=TEST123&am=99&cu=INR&tn=Test"
    
    try:
        result = _generate_qr_code(test_data)
        if result:
            print(f"✅ QR code generated successfully, length: {len(result)}")
            print(f"First 100 chars: {result[:100]}...")
        else:
            print("❌ QR code generation failed")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_qr_generation()
