-- PraxisAI Credit System & Pro Mode Database Schema
-- This extends the existing user management system with daily credits and Pro subscriptions

-- 1. Daily Credits Table
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

-- 2. Credit Usage Logs Table
CREATE TABLE IF NOT EXISTS credit_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    credits_consumed INTEGER DEFAULT 1,
    session_id VARCHAR(100),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- 3. Pro Subscriptions Table
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

-- 4. Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    payment_id VARCHAR(100) NOT NULL UNIQUE,
    qr_code VARCHAR(500),
    upi_link VARCHAR(500),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired', 'refunded')),
    payment_provider VARCHAR(50),
    transaction_id VARCHAR(100),
    webhook_received_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Pro Features Table (for tracking which features require Pro access)
CREATE TABLE IF NOT EXISTS pro_features (
    id SERIAL PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    feature_description TEXT,
    requires_pro BOOLEAN DEFAULT true,
    credits_required INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Pro Features
INSERT INTO pro_features (feature_name, feature_description, requires_pro, credits_required) VALUES
('deep_study_mode', 'Deep Study Mode - Advanced AI tutoring with context memory', true, 1),
('study_plan_generator', 'AI-powered personalized study plan creation', true, 1),
('problem_generator', 'AI-generated JEE practice problems', true, 1),
('pro_ai_chat', 'Advanced AI chat with specialized JEE knowledge', true, 1),
('syllabus_browser', 'Browse JEE syllabus and topics', false, 0),
('quick_help', 'Quick AI help for simple questions', false, 0),
('standard_chat', 'Basic AI chat functionality', false, 0),
('resource_browser', 'Browse educational resources', false, 0)
ON CONFLICT (feature_name) DO NOTHING;

-- 6. Functions for Credit Management

-- Function to get user's daily credit status
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

-- Function to consume a credit
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
    v_credits_used INTEGER;
    v_credits_limit INTEGER;
    v_is_pro_user BOOLEAN;
    v_feature_requires_pro BOOLEAN;
    v_credits_required INTEGER;
BEGIN
    -- Check if user is Pro subscriber
    SELECT subscription_status = 'pro' INTO v_is_pro_user
    FROM pro_subscriptions 
    WHERE user_id = p_user_id;
    
    -- Check if feature requires Pro access
    SELECT requires_pro, credits_required INTO v_feature_requires_pro, v_credits_required
    FROM pro_features 
    WHERE feature_name = p_feature_name;
    
    -- If user is Pro, allow unlimited access
    IF v_is_pro_user THEN
        -- Log the usage but don't consume credits
        INSERT INTO credit_usage_logs (user_id, feature_name, credits_consumed, session_id)
        VALUES (p_user_id, p_feature_name, 0, p_session_id);
        
        RETURN QUERY SELECT true, 999, 'Pro user - unlimited access'::TEXT;
        RETURN;
    END IF;
    
    -- If feature doesn't require Pro, allow free access
    IF NOT v_feature_requires_pro THEN
        INSERT INTO credit_usage_logs (user_id, feature_name, credits_consumed, session_id)
        VALUES (p_user_id, p_feature_name, 0, p_session_id);
        
        RETURN QUERY SELECT true, 999, 'Free feature - no credits required'::TEXT;
        RETURN;
    END IF;
    
    -- Get current credit status
    SELECT credits_used, credits_limit INTO v_credits_used, v_credits_limit
    FROM daily_credits 
    WHERE user_id = p_user_id AND credits_date = CURRENT_DATE;
    
    -- Initialize credits if not exists
    IF v_credits_used IS NULL THEN
        INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
        VALUES (p_user_id, 0, 5, CURRENT_DATE)
        ON CONFLICT (user_id, credits_date) DO NOTHING;
        
        v_credits_used := 0;
        v_credits_limit := 5;
    END IF;
    
    -- Check if user has enough credits
    IF (v_credits_used + v_credits_required) > v_credits_limit THEN
        RETURN QUERY SELECT false, (v_credits_limit - v_credits_used), 'Insufficient credits'::TEXT;
        RETURN;
    END IF;
    
    -- Consume the credit
    INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
    VALUES (p_user_id, v_credits_used + v_credits_required, v_credits_limit, CURRENT_DATE)
    ON CONFLICT (user_id, credits_date) 
    DO UPDATE SET 
        credits_used = daily_credits.credits_used + v_credits_required,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Log the usage
    INSERT INTO credit_usage_logs (user_id, feature_name, credits_consumed, session_id)
    VALUES (p_user_id, p_feature_name, v_credits_required, p_session_id);
    
    RETURN QUERY SELECT true, (v_credits_limit - v_credits_used - v_credits_required), 'Credit consumed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily credits (run at midnight IST)
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS INTEGER AS $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    -- Reset credits for all users
    UPDATE daily_credits 
    SET credits_used = 0, updated_at = CURRENT_TIMESTAMP
    WHERE credits_date < CURRENT_DATE;
    
    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    
    -- Insert new credit records for today for active users
    INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
    SELECT DISTINCT user_id, 0, 5, CURRENT_DATE
    FROM users
    WHERE user_id NOT IN (
        SELECT user_id FROM daily_credits WHERE credits_date = CURRENT_DATE
    );
    
    RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to upgrade user to Pro
CREATE OR REPLACE FUNCTION upgrade_to_pro(
    p_user_id VARCHAR(50),
    p_payment_id VARCHAR(100),
    p_amount DECIMAL(10,2),
    p_currency VARCHAR(3) DEFAULT 'INR'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    -- Update or insert Pro subscription
    INSERT INTO pro_subscriptions (
        user_id, 
        subscription_status, 
        subscription_tier, 
        subscribed_at, 
        expires_at,
        payment_id,
        payment_status,
        amount_paid,
        currency
    ) VALUES (
        p_user_id,
        'pro',
        'pro_monthly',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '1 month',
        p_payment_id,
        'completed',
        p_amount,
        p_currency
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        subscription_status = 'pro',
        subscription_tier = 'pro_monthly',
        subscribed_at = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + INTERVAL '1 month',
        payment_id = p_payment_id,
        payment_status = 'completed',
        amount_paid = p_amount,
        currency = p_currency,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update payment transaction status
    UPDATE payment_transactions 
    SET payment_status = 'completed', webhook_received_at = CURRENT_TIMESTAMP
    WHERE payment_id = p_payment_id;
    
    RETURN QUERY SELECT true, 'Successfully upgraded to Pro'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to create payment transaction
CREATE OR REPLACE FUNCTION create_payment_transaction(
    p_user_id VARCHAR(50),
    p_amount DECIMAL(10,2),
    p_currency VARCHAR(3) DEFAULT 'INR'
)
RETURNS TABLE (
    payment_id VARCHAR(100),
    qr_code VARCHAR(500),
    upi_link VARCHAR(500),
    expires_at TIMESTAMP
) AS $$
DECLARE
    v_payment_id VARCHAR(100);
    v_qr_code VARCHAR(500);
    v_upi_link VARCHAR(500);
    v_expires_at TIMESTAMP;
BEGIN
    -- Generate unique payment ID
    v_payment_id := 'PAY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    -- Set expiration time (15 minutes from now)
    v_expires_at := CURRENT_TIMESTAMP + INTERVAL '15 minutes';
    
    -- Generate UPI payment link (this would be replaced with actual payment provider integration)
    v_upi_link := 'upi://pay?pa=praxisai@paytm&pn=PraxisAI&am=' || p_amount || '&cu=' || p_currency || '&tr=' || v_payment_id;
    
    -- Generate QR code data (this would be replaced with actual QR generation)
    v_qr_code := 'upi://pay?pa=praxisai@paytm&pn=PraxisAI&am=' || p_amount || '&cu=' || p_currency || '&tr=' || v_payment_id;
    
    -- Insert payment transaction
    INSERT INTO payment_transactions (
        user_id, payment_id, qr_code, upi_link, amount, currency, expires_at
    ) VALUES (
        p_user_id, v_payment_id, v_qr_code, v_upi_link, p_amount, p_currency, v_expires_at
    );
    
    RETURN QUERY SELECT v_payment_id, v_qr_code, v_upi_link, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_credits_user_date ON daily_credits(user_id, credits_date);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_user_date ON credit_usage_logs(user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_user ON pro_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE daily_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for daily_credits
CREATE POLICY "Users can view their own credits" ON daily_credits
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- Policies for credit_usage_logs
CREATE POLICY "Users can view their own usage logs" ON credit_usage_logs
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- Policies for pro_subscriptions
CREATE POLICY "Users can view their own subscription" ON pro_subscriptions
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- Policies for payment_transactions
CREATE POLICY "Users can view their own payments" ON payment_transactions
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- 9. Sample data for testing
INSERT INTO users (user_id, email, name) VALUES 
('test_user_123', 'test@praxisai.com', 'Test User'),
('pro_user_456', 'pro@praxisai.com', 'Pro User')
ON CONFLICT (user_id) DO NOTHING;

-- Insert Pro subscription for test user
INSERT INTO pro_subscriptions (user_id, subscription_status, subscription_tier, subscribed_at, expires_at)
VALUES ('pro_user_456', 'pro', 'pro_monthly', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample daily credits
INSERT INTO daily_credits (user_id, credits_used, credits_limit, credits_date)
VALUES 
('test_user_123', 2, 5, CURRENT_DATE),
('pro_user_456', 0, 999, CURRENT_DATE)
ON CONFLICT (user_id, credits_date) DO NOTHING;

