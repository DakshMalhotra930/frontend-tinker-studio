#!/usr/bin/env python3
"""
Create payment_qr_codes table in production database
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT", "5432")

def create_qr_payment_table():
    """Create payment_qr_codes table"""
    try:
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        
        with conn.cursor() as cur:
            print("📝 Creating payment_qr_codes table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payment_qr_codes (
                    id SERIAL PRIMARY KEY,
                    qr_code VARCHAR(255) UNIQUE NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    tier VARCHAR(50) NOT NULL,
                    user_id VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    payment_id VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            print("✅ payment_qr_codes table created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("🚀 Creating payment_qr_codes table...")
    success = create_qr_payment_table()
    if success:
        print("🎉 Table creation completed successfully!")
    else:
        print("💥 Table creation failed!")
        exit(1)
