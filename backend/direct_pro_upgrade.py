#!/usr/bin/env python3
"""
Direct database script to give pro access to dakshmalhotra930@gmail.com
This bypasses the payment system and directly updates the database
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def direct_pro_upgrade():
    """Directly upgrade user to pro in database"""
    print("🔧 Directly upgrading user to pro...")
    
    try:
        import psycopg2
        
        # Connect to database
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT', 5432)
        )
        
        with conn.cursor() as cur:
            user_id = 'user_f193c3a0b1a0'  # Generated user_id for dakshmalhotra930@gmail.com
            
            print(f"Upgrading user: {user_id}")
            
            # Directly insert/update pro subscription
            cur.execute("""
                INSERT INTO pro_subscriptions (user_id, subscription_status, subscription_tier, subscribed_at, expires_at)
                VALUES (%s, 'pro', 'pro', NOW(), NOW() + INTERVAL '1 year')
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    subscription_status = 'pro',
                    subscription_tier = 'pro',
                    subscribed_at = NOW(),
                    expires_at = NOW() + INTERVAL '1 year',
                    updated_at = NOW()
            """, (user_id,))
            
            print("✅ Pro subscription updated successfully!")
            
            # Verify the update
            cur.execute("""
                SELECT user_id, subscription_status, subscription_tier, subscribed_at, expires_at
                FROM pro_subscriptions 
                WHERE user_id = %s
            """, (user_id,))
            
            result = cur.fetchone()
            if result:
                print(f"✅ Verification successful: {result}")
            else:
                print("❌ Verification failed - no record found")
                
        conn.commit()
        conn.close()
        return True
        
    except ImportError:
        print("❌ psycopg2 not available, trying alternative approach...")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    success = direct_pro_upgrade()
    if success:
        print('🎉 Pro access granted successfully!')
    else:
        print('💥 Failed to grant pro access')
        sys.exit(1)
