#!/usr/bin/env python3
"""
Database Schema Setup Script
This script creates all required database tables for the credit system
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

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        return None

def setup_database():
    """Create all required database tables"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        with conn.cursor() as cur:
            print("🔄 Setting up database schema...")
            
            # 1. Create daily_credits table
            print("📝 Creating daily_credits table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS daily_credits (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    credits_used INTEGER DEFAULT 0,
                    credits_limit INTEGER DEFAULT 5,
                    credits_date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, credits_date)
                );
            """)
            
            # 2. Create credit_usage_logs table
            print("📝 Creating credit_usage_logs table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS credit_usage_logs (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    feature_name VARCHAR(100) NOT NULL,
                    credits_consumed INTEGER DEFAULT 1,
                    session_id VARCHAR(100),
                    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB
                );
            """)
            
            # 3. Create pro_subscriptions table
            print("📝 Creating pro_subscriptions table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pro_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL UNIQUE,
                    subscription_status VARCHAR(20) DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'expired', 'cancelled')),
                    subscription_tier VARCHAR(30) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro_monthly', 'pro_yearly', 'pro_lifetime')),
                    subscribed_at TIMESTAMP,
                    expires_at TIMESTAMP,
                    payment_id VARCHAR(100),
                    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
                    amount_paid DECIMAL(10,2),
                    currency VARCHAR(3) DEFAULT 'INR',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 4. Create payment_transactions table
            print("📝 Creating payment_transactions table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payment_transactions (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    payment_id VARCHAR(100) NOT NULL UNIQUE,
                    qr_code VARCHAR(500),
                    upi_link VARCHAR(500),
                    amount DECIMAL(10,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'INR',
                    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired', 'refunded')),
                    transaction_id VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 5. Create payment_qr_codes table
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
            
            # 6. Create pro_features table
            print("📝 Creating pro_features table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pro_features (
                    id SERIAL PRIMARY KEY,
                    feature_name VARCHAR(100) NOT NULL UNIQUE,
                    feature_description TEXT,
                    requires_pro BOOLEAN DEFAULT true,
                    credits_required INTEGER DEFAULT 1,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 6. Insert default pro features
            print("📝 Inserting default pro features...")
            cur.execute("""
                INSERT INTO pro_features (feature_name, feature_description, requires_pro, credits_required)
                VALUES 
                    ('deep_study_mode', 'Advanced AI tutoring with context memory', true, 1),
                    ('study_plan_generator', 'AI-powered personalized study plans', true, 1),
                    ('problem_generator', 'AI-generated JEE practice problems', true, 1),
                    ('pro_ai_chat', 'Advanced AI chat with specialized JEE knowledge', true, 1)
                ON CONFLICT (feature_name) DO NOTHING;
            """)
            
            conn.commit()
            print("✅ All database tables created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting database schema setup...")
    success = setup_database()
    if success:
        print("🎉 Database setup completed successfully!")
    else:
        print("💥 Database setup failed!")
        exit(1)

