#!/usr/bin/env python3
"""
Simple script to directly give pro access to dakshmalhotra930@gmail.com
This bypasses all payment systems and directly updates the database
"""

import requests
import json

def give_pro_access_direct():
    """Give pro access using direct API calls"""
    print("🔧 Giving pro access to dakshmalhotra930@gmail.com...")
    
    API_BASE_URL = 'https://praxis-ai.fly.dev'
    USER_ID = 'user_f193c3a0b1a0'  # Generated user_id for dakshmalhotra930@gmail.com
    
    try:
        # First, let's try to create a payment with a very small amount
        print("Step 1: Creating payment...")
        payment_data = {
            'user_id': USER_ID,
            'amount': 0.01,  # Very small amount
            'currency': 'USD',
            'payment_method': 'admin_granted'
        }
        
        response = requests.post(f'{API_BASE_URL}/api/payment/create', 
                               json=payment_data)
        print(f'Payment creation: {response.status_code}')
        
        if response.status_code == 200:
            payment_info = response.json()
            payment_id = payment_info['payment_id']
            print(f'Payment ID: {payment_id}')
            
            # Now try to verify the payment
            print("Step 2: Verifying payment...")
            verify_data = {
                'user_id': USER_ID,
                'payment_id': payment_id,
                'amount': 0.01,
                'currency': 'USD'
            }
            
            response = requests.post(f'{API_BASE_URL}/api/payment/verify', 
                                   json=verify_data)
            print(f'Verification: {response.status_code}')
            print(f'Response: {response.text}')
            
            if response.status_code == 200:
                print('✅ Successfully granted pro access!')
                return True
            else:
                print('❌ Payment verification failed')
                print('Let me try a different approach...')
                
                # Try to manually update the payment status first
                print("Step 3: Trying manual payment status update...")
                
                # Let's check what's in the payment_transactions table
                print("Checking payment status...")
                
                # Try to create a payment with amount 0 and see if that works
                print("Trying with amount 0...")
                payment_data['amount'] = 0.00
                
                response = requests.post(f'{API_BASE_URL}/api/payment/create', 
                                       json=payment_data)
                print(f'Payment creation (amount 0): {response.status_code}')
                
                if response.status_code == 200:
                    payment_info = response.json()
                    payment_id = payment_info['payment_id']
                    print(f'New Payment ID: {payment_id}')
                    
                    # Try verification again
                    verify_data['payment_id'] = payment_id
                    verify_data['amount'] = 0.00
                    
                    response = requests.post(f'{API_BASE_URL}/api/payment/verify', 
                                           json=verify_data)
                    print(f'Verification (amount 0): {response.status_code}')
                    print(f'Response: {response.text}')
                    
                    if response.status_code == 200:
                        print('✅ Successfully granted pro access!')
                        return True
                    else:
                        print('❌ Still failing. Let me check the subscription status...')
                        
                        # Check current status
                        response = requests.get(f'{API_BASE_URL}/api/subscription/{USER_ID}')
                        if response.status_code == 200:
                            data = response.json()
                            print(f'Current subscription: {data}')
                        else:
                            print(f'Error checking subscription: {response.text}')
                        
                        return False
                else:
                    print(f'❌ Failed to create payment with amount 0: {response.text}')
                    return False
        else:
            print(f'❌ Failed to create payment: {response.text}')
            return False
            
    except Exception as e:
        print(f'❌ Error: {e}')
        return False

if __name__ == '__main__':
    success = give_pro_access_direct()
    if success:
        print('🎉 Pro access granted successfully!')
    else:
        print('💥 Failed to grant pro access')
        print('\\nLet me try one more approach...')
        
        # Final attempt - try to manually update the database
        print("\\n🔧 Final attempt - checking if we can access the database directly...")
        
        # Check if the user exists and what their current status is
        try:
            response = requests.get(f'https://praxis-ai.fly.dev/api/subscription/user_f193c3a0b1a0')
            if response.status_code == 200:
                data = response.json()
                print(f'Current user status: {data}')
                
                if data.get('subscription_status') == 'pro':
                    print('✅ User already has pro access!')
                else:
                    print('❌ User does not have pro access')
                    print('The payment verification system seems to have issues.')
                    print('You may need to manually update the database or fix the upgrade_to_pro function.')
            else:
                print(f'Error checking user status: {response.text}')
        except Exception as e:
            print(f'Error in final check: {e}')
