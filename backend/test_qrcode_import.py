#!/usr/bin/env python3
"""
Test qrcode import
"""

try:
    import qrcode
    print("✅ qrcode import successful")
    
    # Test basic QR code generation
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data("test")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    print("✅ QR code generation successful")
    
except ImportError as e:
    print(f"❌ qrcode import failed: {e}")
except Exception as e:
    print(f"❌ QR code generation failed: {e}")
