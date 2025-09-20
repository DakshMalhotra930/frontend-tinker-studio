#!/usr/bin/env python3
"""
Script to give pro access to dakshmalhotra930@gmail.com
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the database connection function
from main import get_db_connection

def give_pro_access():
    """Give pro access to dakshmalhotra930@gmail.com"""
    print("🔧 Giving pro access to dakshmalhotra930@gmail.com...")
    
    # Load environment variables
    load_dotenv()
    
    # Connect to database
    conn = get_db_connection()
    if not conn:
        print("❌ Database connection failed")
        return False
    
    try:
        with conn.cursor() as cur:
            # First, get the user_id for the email
            cur.execute('SELECT user_id FROM users WHERE email = %s', ('dakshmalhotra930@gmail.com',))
            result = cur.fetchone()
            
            if not result:
                print('❌ User not found with email: dakshmalhotra930@gmail.com')
                return False
                
            user_id = result[0]
            print(f'✅ Found user_id: {user_id}')
            
            # Give pro access using the upgrade_to_pro function
            cur.execute('SELECT upgrade_to_pro(%s, %s, %s, %s)', 
                       (user_id, 'admin_granted', 0.00, 'USD'))
            result = cur.fetchone()
            
            if result and result[0]:
                print('✅ Successfully granted pro access!')
                return True
            else:
                print('❌ Failed to grant pro access')
                return False
                
    except Exception as e:
        print(f'❌ Error: {e}')
        return False
    finally:
        conn.commit()
        conn.close()

if __name__ == '__main__':
    success = give_pro_access()
    if success:
        print('🎉 Pro access granted successfully!')
    else:
        print('💥 Failed to grant pro access')
        sys.exit(1)