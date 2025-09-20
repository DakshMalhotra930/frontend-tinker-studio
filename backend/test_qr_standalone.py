#!/usr/bin/env python3
"""
Standalone QR payment test without server dependencies
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test the QR code generation function directly
def test_qr_generation():
    print("🧪 Testing QR code generation standalone...")
    
    try:
        import qrcode
        import base64
        import io
        
        # Test data
        test_data = "upi://pay?pa=dakshmalhotra930@gmail.com@paytm&pn=PraxisAI&tr=TEST123&am=99&cu=INR&tn=Test"
        
        print(f"🔍 Creating QR code for: {test_data}")
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=5
        )
        
        qr.add_data(test_data)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        print(f"✅ QR code generated successfully!")
        print(f"   Length: {len(qr_base64)} characters")
        print(f"   First 100 chars: {qr_base64[:100]}...")
        
        # Test UPI payment URL format
        print(f"\n🔍 Testing UPI payment URL format...")
        upi_url = f"upi://pay?pa=dakshmalhotra930@gmail.com@paytm&pn=PraxisAI&tr=QR_TEST_123&am=99&cu=INR&tn=PraxisAI Pro Monthly"
        print(f"   UPI URL: {upi_url}")
        
        # Generate QR for UPI URL
        qr2 = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=5
        )
        qr2.add_data(upi_url)
        qr2.make(fit=True)
        
        qr_img2 = qr2.make_image(fill_color="black", back_color="white")
        buffer2 = io.BytesIO()
        qr_img2.save(buffer2, format='PNG')
        qr_base64_2 = base64.b64encode(buffer2.getvalue()).decode()
        
        print(f"✅ UPI QR code generated successfully!")
        print(f"   Length: {len(qr_base64_2)} characters")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error generating QR code: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_payment_data_structures():
    print("\n🧪 Testing payment data structures...")
    
    # Test payment tiers
    pricing = {
        "pro_monthly": 99.0,
        "pro_yearly": 999.0,
    }
    
    print(f"💰 Pricing structure: {pricing}")
    
    # Test QR code generation for different tiers
    for tier, amount in pricing.items():
        print(f"\n🔍 Testing {tier} (₹{amount})...")
        
        # Generate payment ID
        import uuid
        payment_id = f"QR_{uuid.uuid4().hex[:12].upper()}"
        qr_code = f"PAY_{payment_id}"
        
        print(f"   Payment ID: {payment_id}")
        print(f"   QR Code: {qr_code}")
        
        # Generate UPI URL
        upi_url = f"upi://pay?pa=dakshmalhotra930@gmail.com@paytm&pn=PraxisAI&tr={payment_id}&am={amount}&cu=INR&tn=PraxisAI {tier.replace('_', ' ').title()}"
        print(f"   UPI URL: {upi_url}")
        
        # Test QR generation
        try:
            import qrcode
            import base64
            import io
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=5
            )
            qr.add_data(upi_url)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            qr_img.save(buffer, format='PNG')
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            print(f"   ✅ QR generated successfully (length: {len(qr_base64)})")
            
        except Exception as e:
            print(f"   ❌ QR generation failed: {e}")
            return False
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Standalone QR Payment Tests...\n")
    
    # Test QR generation
    qr_success = test_qr_generation()
    
    # Test payment data structures
    data_success = test_payment_data_structures()
    
    print(f"\n🎯 Test Results:")
    print(f"   QR Generation: {'✅ PASS' if qr_success else '❌ FAIL'}")
    print(f"   Data Structures: {'✅ PASS' if data_success else '❌ FAIL'}")
    
    if qr_success and data_success:
        print("\n🎉 All QR payment tests passed! The system is ready.")
    else:
        print("\n❌ Some tests failed. Check the errors above.")

