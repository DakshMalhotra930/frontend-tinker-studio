#!/usr/bin/env python3
"""
Database Functions Deployment Script
This script ensures all required database functions are properly deployed
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

def deploy_functions():
    """Deploy all required database functions"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        with conn.cursor() as cur:
            print("🔄 Deploying database functions...")
            
            # 1. Create get_daily_credits function
            print("📝 Creating get_daily_credits function...")
            cur.execute("""
                CREATE OR REPLACE FUNCTION get_daily_credits(p_user_id VARCHAR(50))
                RETURNS TABLE (
                    user_id VARCHAR(50),
                    credits_used INTEGER,
                    credits_remaining INTEGER,
                    credits_limit INTEGER,
                    credits_date DATE,
                    is_pro_user BOOLEAN
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        COALESCE(dc.user_id, p_user_id) as user_id,
                        COALESCE(dc.credits_used, 0) as credits_used,
                        (COALESCE(dc.credits_limit, 5) - COALESCE(dc.credits_used, 0)) as credits_remaining,
                        COALESCE(dc.credits_limit, 5) as credits_limit,
                        COALESCE(dc.credits_date, CURRENT_DATE) as credits_date,
                        COALESCE(ps.subscription_status = 'pro', false) as is_pro_user
                    FROM 
                        (SELECT p_user_id as user_id) u
                    LEFT JOIN daily_credits dc ON u.user_id = dc.user_id AND dc.credits_date = CURRENT_DATE
                    LEFT JOIN pro_subscriptions ps ON u.user_id = ps.user_id AND ps.subscription_status = 'pro';
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # 2. Create consume_credit function
            print("📝 Creating consume_credit function...")
            cur.execute("""
                CREATE OR REPLACE FUNCTION consume_credit(
                    p_user_id VARCHAR(50),
                    p_feature_name VARCHAR(100),
                    p_session_id VARCHAR(100) DEFAULT NULL
                )
                RETURNS TABLE (
                    success BOOLEAN,
                    credits_remaining INTEGER,
                    message TEXT
                ) AS $$
                DECLARE
                    current_credits INTEGER;
                    credit_limit INTEGER;
                    is_pro BOOLEAN;
                BEGIN
                    -- Get current credit status
                    SELECT (dc.credits_limit - dc.credits_used), dc.credits_limit, 
                           COALESCE(ps.subscription_status = 'pro', false)
                    INTO current_credits, credit_limit, is_pro
                    FROM daily_credits dc
                    LEFT JOIN pro_subscriptions ps ON dc.user_id = ps.user_id
                    WHERE dc.user_id = p_user_id AND dc.credits_date = CURRENT_DATE;
                    
                    -- If no record exists, create one
                    IF current_credits IS NULL THEN
                        INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
                        VALUES (p_user_id, 0, 5, CURRENT_DATE)
                        ON CONFLICT (user_id, credits_date) DO NOTHING;
                        
                        current_credits := 5;
                        credit_limit := 5;
                        is_pro := false;
                    END IF;
                    
                    -- Check if user is pro (unlimited credits)
                    IF is_pro THEN
                        -- Log the usage but don't consume credits
                        INSERT INTO credit_usage_logs (user_id, feature_name, credits_consumed, session_id)
                        VALUES (p_user_id, p_feature_name, 0, p_session_id);
                        
                        RETURN QUERY SELECT true, current_credits, 'Pro user - unlimited access';
                        RETURN;
                    END IF;
                    
                    -- Check if user has credits
                    IF current_credits <= 0 THEN
                        RETURN QUERY SELECT false, current_credits, 'No credits remaining';
                        RETURN;
                    END IF;
                    
                    -- Consume credit
                    UPDATE daily_credits 
                    SET credits_used = credits_used + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = p_user_id AND credits_date = CURRENT_DATE;
                    
                    -- Log the usage
                    INSERT INTO credit_usage_logs (user_id, feature_name, credits_consumed, session_id)
                    VALUES (p_user_id, p_feature_name, 1, p_session_id);
                    
                    -- Return success with remaining credits
                    RETURN QUERY SELECT true, current_credits - 1, 'Credit consumed successfully';
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # 3. Create other required functions
            print("📝 Creating additional functions...")
            
            # Reset daily credits function
            cur.execute("""
                CREATE OR REPLACE FUNCTION reset_daily_credits()
                RETURNS INTEGER AS $$
                DECLARE
                    reset_count INTEGER;
                BEGIN
                    -- Reset credits for all users
                    UPDATE daily_credits 
                    SET credits_used = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE credits_date < CURRENT_DATE;
                    
                    GET DIAGNOSTICS reset_count = ROW_COUNT;
                    RETURN reset_count;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Create payment transaction function
            cur.execute("""
                CREATE OR REPLACE FUNCTION create_payment_transaction(
                    p_user_id VARCHAR(50),
                    p_amount DECIMAL(10,2),
                    p_currency VARCHAR(3)
                )
                RETURNS TABLE (
                    payment_id VARCHAR(100),
                    qr_code VARCHAR(500),
                    upi_link VARCHAR(500),
                    expires_at TIMESTAMP
                ) AS $$
                DECLARE
                    new_payment_id VARCHAR(100);
                    qr_data VARCHAR(500);
                    upi_data VARCHAR(500);
                    expiry_time TIMESTAMP;
                BEGIN
                    -- Generate payment ID
                    new_payment_id := 'pay_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
                    
                    -- Generate QR code data
                    qr_data := 'upi://pay?pa=praxisai@paytm&pn=PraxisAI&am=' || p_amount || '&cu=' || p_currency || '&tn=JEE%20Prep%20Subscription';
                    
                    -- Generate UPI link
                    upi_data := 'upi://pay?pa=praxisai@paytm&pn=PraxisAI&am=' || p_amount || '&cu=' || p_currency || '&tn=JEE%20Prep%20Subscription';
                    
                    -- Set expiry time (24 hours from now)
                    expiry_time := CURRENT_TIMESTAMP + INTERVAL '24 hours';
                    
                    -- Insert payment record
                    INSERT INTO payment_transactions (user_id, payment_id, qr_code, upi_link, amount, currency, expires_at)
                    VALUES (p_user_id, new_payment_id, qr_data, upi_data, p_amount, p_currency, expiry_time);
                    
                    RETURN QUERY SELECT new_payment_id, qr_data, upi_data, expiry_time;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Upgrade to pro function
            cur.execute("""
                CREATE OR REPLACE FUNCTION upgrade_to_pro(
                    p_user_id VARCHAR(50),
                    p_payment_id VARCHAR(100),
                    p_amount DECIMAL(10,2),
                    p_currency VARCHAR(3)
                )
                RETURNS BOOLEAN AS $$
                BEGIN
                    -- Update or insert pro subscription
                    INSERT INTO pro_subscriptions (
                        user_id, subscription_status, subscription_tier, 
                        subscribed_at, expires_at, payment_id, 
                        payment_status, amount_paid, currency
                    ) VALUES (
                        p_user_id, 'pro', 'pro_monthly',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month',
                        p_payment_id, 'completed', p_amount, p_currency
                    )
                    ON CONFLICT (user_id) DO UPDATE SET
                        subscription_status = 'pro',
                        subscription_tier = 'pro_monthly',
                        subscribed_at = CURRENT_TIMESTAMP,
                        expires_at = CURRENT_TIMESTAMP + INTERVAL '1 month',
                        payment_id = p_payment_id,
                        payment_status = 'completed',
                        amount_paid = p_amount,
                        currency = p_currency,
                        updated_at = CURRENT_TIMESTAMP;
                    
                    -- Update payment status
                    UPDATE payment_transactions 
                    SET payment_status = 'completed', updated_at = CURRENT_TIMESTAMP
                    WHERE payment_id = p_payment_id;
                    
                    RETURN true;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            conn.commit()
            print("✅ All database functions deployed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error deploying functions: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting database functions deployment...")
    success = deploy_functions()
    if success:
        print("🎉 Database deployment completed successfully!")
    else:
        print("💥 Database deployment failed!")
        exit(1)
