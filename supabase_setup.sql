-- =====================================================
-- PRAXIS AI USER MANAGEMENT SYSTEM - SUPABASE SETUP
-- =====================================================
-- This script creates all necessary tables, functions, and policies
-- for the frontend user management system with free/premium logic

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL, -- Google OAuth user ID
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'FREE' CHECK (subscription_status IN ('FREE', 'PRO')),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. DAILY USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    usage_limit INTEGER DEFAULT 5 CHECK (usage_limit > 0),
    last_used_at TIMESTAMP WITH TIME ZONE,
    reset_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- =====================================================
-- 3. FEATURE USAGE LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    session_id TEXT,
    metadata JSONB,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TRIAL SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS trial_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    sessions_used INTEGER DEFAULT 0 CHECK (sessions_used >= 0),
    sessions_remaining INTEGER DEFAULT 5 CHECK (sessions_remaining >= 0),
    last_trial_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_name)
);

-- =====================================================
-- 5. SUBSCRIPTION FEATURES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_name TEXT UNIQUE NOT NULL,
    feature_type TEXT NOT NULL CHECK (feature_type IN ('FREE', 'PRO')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================
-- Add foreign key constraints after tables are created
ALTER TABLE daily_usage 
ADD CONSTRAINT fk_daily_usage_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE feature_usage_logs 
ADD CONSTRAINT fk_feature_usage_logs_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE trial_sessions 
ADD CONSTRAINT fk_trial_sessions_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- =====================================================
-- 7. INSERT DEFAULT FEATURES
-- =====================================================
INSERT INTO subscription_features (feature_name, feature_type, description) VALUES
-- FREE FEATURES
('syllabus', 'FREE', 'Interactive JEE Syllabus Explorer'),
('generate_content', 'FREE', 'Generate Practice Questions'),
('ask_question', 'FREE', 'Ask AI Questions & Get Answers'),
('problem_solver', 'FREE', 'Problem Solver with Step-by-Step Solutions'),
('chat', 'FREE', 'Casual Chat with AI Tutor'),
('image_solve', 'FREE', 'Image-based Problem Solving'),
('study_plan', 'FREE', 'Basic Study Plan Generation'),

-- PRO FEATURES
('deep_study_mode', 'PRO', 'Unlimited Deep Study Mode Sessions'),
('advanced_quiz', 'PRO', 'Advanced AI Tutoring & Mentoring'),
('personalized_tutoring', 'PRO', 'Personalized AI Tutoring'),
('unlimited_sessions', 'PRO', 'Unlimited Daily Sessions'),
('priority_support', 'PRO', 'Priority Customer Support')
ON CONFLICT (feature_name) DO NOTHING;

-- =====================================================
-- 8. FUNCTIONS
-- =====================================================

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION is_premium_user(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE email = user_email 
        AND (is_premium = TRUE OR subscription_status = 'PRO')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user features
CREATE OR REPLACE FUNCTION get_user_features(user_email TEXT)
RETURNS TABLE (
    user_id TEXT,
    features TEXT[],
    subscription_status TEXT,
    trial_sessions_remaining INTEGER,
    has_pro_access BOOLEAN
) AS $$
DECLARE
    user_record users%ROWTYPE;
    user_features TEXT[];
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE email = user_email;
    
    IF NOT FOUND THEN
        -- Return default free user features
        RETURN QUERY SELECT 
            user_email::TEXT,
            ARRAY['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve', 'study_plan'],
            'FREE'::TEXT,
            5::INTEGER,
            FALSE::BOOLEAN;
        RETURN;
    END IF;
    
    -- Get available features based on subscription
    IF user_record.is_premium OR user_record.subscription_status = 'PRO' THEN
        -- Pro user gets all features
        SELECT ARRAY_AGG(feature_name) INTO user_features
        FROM subscription_features 
        WHERE is_active = TRUE;
    ELSE
        -- Free user gets only free features
        SELECT ARRAY_AGG(feature_name) INTO user_features
        FROM subscription_features 
        WHERE feature_type = 'FREE' AND is_active = TRUE;
    END IF;
    
    -- Get trial sessions remaining
    DECLARE
        trial_remaining INTEGER := 5;
    BEGIN
        SELECT COALESCE(SUM(sessions_remaining), 5) INTO trial_remaining
        FROM trial_sessions 
        WHERE user_id = user_record.user_id;
    END;
    
    RETURN QUERY SELECT 
        user_record.user_id,
        COALESCE(user_features, ARRAY[]::TEXT[]),
        user_record.subscription_status,
        trial_remaining,
        (user_record.is_premium OR user_record.subscription_status = 'PRO');
END;
$$ LANGUAGE plpgsql;

-- Function to track feature usage
CREATE OR REPLACE FUNCTION track_feature_usage(
    p_user_id TEXT,
    p_feature_name TEXT,
    p_session_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_record users%ROWTYPE;
    usage_record daily_usage%ROWTYPE;
    can_use_feature BOOLEAN := FALSE;
    new_usage_count INTEGER;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is premium
    IF user_record.is_premium OR user_record.subscription_status = 'PRO' THEN
        can_use_feature := TRUE;
    ELSE
        -- Check daily usage for free users
        SELECT * INTO usage_record 
        FROM daily_usage 
        WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
        
        IF NOT FOUND THEN
            -- First usage today
            INSERT INTO daily_usage (user_id, usage_date, usage_count, usage_limit, last_used_at, reset_time)
            VALUES (p_user_id, CURRENT_DATE, 1, 5, NOW(), NOW() + INTERVAL '24 hours');
            can_use_feature := TRUE;
        ELSE
            -- Check if under limit
            IF usage_record.usage_count < usage_record.usage_limit THEN
                new_usage_count := usage_record.usage_count + 1;
                UPDATE daily_usage 
                SET usage_count = new_usage_count, 
                    last_used_at = NOW(),
                    updated_at = NOW()
                WHERE id = usage_record.id;
                can_use_feature := TRUE;
            END IF;
        END IF;
    END IF;
    
    -- Log the usage attempt
    INSERT INTO feature_usage_logs (user_id, feature_name, session_id, metadata)
    VALUES (p_user_id, p_feature_name, p_session_id, p_metadata);
    
    RETURN can_use_feature;
END;
$$ LANGUAGE plpgsql;

-- Function to use trial session
CREATE OR REPLACE FUNCTION use_trial_session(
    p_user_id TEXT,
    p_feature_name TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    trial_sessions_remaining INTEGER,
    sessions_remaining INTEGER,
    feature TEXT,
    upgrade_required BOOLEAN
) AS $$
DECLARE
    user_record users%ROWTYPE;
    trial_record trial_sessions%ROWTYPE;
    total_trials_used INTEGER := 0;
    total_trials_remaining INTEGER := 0;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found', 0, 0, p_feature_name, TRUE;
        RETURN;
    END IF;
    
    -- Check if user is already premium
    IF user_record.is_premium OR user_record.subscription_status = 'PRO' THEN
        RETURN QUERY SELECT TRUE, 'User already has Pro access', 0, 0, p_feature_name, FALSE;
        RETURN;
    END IF;
    
    -- Get or create trial record for this feature
    SELECT * INTO trial_record 
    FROM trial_sessions 
    WHERE user_id = p_user_id AND feature_name = p_feature_name;
    
    IF NOT FOUND THEN
        INSERT INTO trial_sessions (user_id, feature_name, sessions_used, sessions_remaining, last_trial_date)
        VALUES (p_user_id, p_feature_name, 0, 5, CURRENT_DATE)
        RETURNING * INTO trial_record;
    END IF;
    
    -- Check if trials available
    IF trial_record.sessions_remaining <= 0 THEN
        RETURN QUERY SELECT FALSE, 'No trial sessions remaining for this feature', 0, 0, p_feature_name, TRUE;
        RETURN;
    END IF;
    
    -- Use trial session
    UPDATE trial_sessions 
    SET sessions_used = sessions_used + 1,
        sessions_remaining = sessions_remaining - 1,
        last_trial_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = trial_record.id
    RETURNING * INTO trial_record;
    
    -- Get total trials remaining across all features
    SELECT COALESCE(SUM(sessions_remaining), 0) INTO total_trials_remaining
    FROM trial_sessions 
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
        TRUE, 
        'Trial session used successfully', 
        total_trials_remaining,
        trial_record.sessions_remaining,
        p_feature_name,
        (total_trials_remaining = 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get usage status
CREATE OR REPLACE FUNCTION get_usage_status(user_email TEXT)
RETURNS TABLE (
    user_type TEXT,
    usage_count INTEGER,
    usage_limit INTEGER,
    can_use_feature BOOLEAN,
    last_used_at TIMESTAMP WITH TIME ZONE,
    reset_time TIMESTAMP WITH TIME ZONE,
    is_premium BOOLEAN
) AS $$
DECLARE
    user_record users%ROWTYPE;
    usage_record daily_usage%ROWTYPE;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE email = user_email;
    
    IF NOT FOUND THEN
        -- Return default free user status
        RETURN QUERY SELECT 
            'free'::TEXT,
            0::INTEGER,
            5::INTEGER,
            TRUE::BOOLEAN,
            NULL::TIMESTAMP WITH TIME ZONE,
            NULL::TIMESTAMP WITH TIME ZONE,
            FALSE::BOOLEAN;
        RETURN;
    END IF;
    
    -- Check if premium
    IF user_record.is_premium OR user_record.subscription_status = 'PRO' THEN
        RETURN QUERY SELECT 
            'premium'::TEXT,
            0::INTEGER,
            999999::INTEGER,
            TRUE::BOOLEAN,
            NULL::TIMESTAMP WITH TIME ZONE,
            NULL::TIMESTAMP WITH TIME ZONE,
            TRUE::BOOLEAN;
        RETURN;
    END IF;
    
    -- Get daily usage
    SELECT * INTO usage_record 
    FROM daily_usage 
    WHERE user_id = user_record.user_id AND usage_date = CURRENT_DATE;
    
    IF NOT FOUND THEN
        -- No usage today
        RETURN QUERY SELECT 
            'free'::TEXT,
            0::INTEGER,
            5::INTEGER,
            TRUE::BOOLEAN,
            NULL::TIMESTAMP WITH TIME ZONE,
            NULL::TIMESTAMP WITH TIME ZONE,
            FALSE::BOOLEAN;
    ELSE
        -- Return current usage
        RETURN QUERY SELECT 
            'free'::TEXT,
            usage_record.usage_count,
            usage_record.usage_limit,
            (usage_record.usage_count < usage_record.usage_limit),
            usage_record.last_used_at,
            usage_record.reset_time,
            FALSE::BOOLEAN;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_user ON feature_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_used_at ON feature_usage_logs(used_at);
CREATE INDEX IF NOT EXISTS idx_trial_sessions_user ON trial_sessions(user_id);

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Daily usage policies
CREATE POLICY "Users can view own usage" ON daily_usage
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own usage" ON daily_usage
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own usage" ON daily_usage
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Feature usage logs policies
CREATE POLICY "Users can view own logs" ON feature_usage_logs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own logs" ON feature_usage_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Trial sessions policies
CREATE POLICY "Users can view own trials" ON trial_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own trials" ON trial_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own trials" ON trial_sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Subscription features are public read-only
CREATE POLICY "Anyone can view features" ON subscription_features
    FOR SELECT USING (true);

-- =====================================================
-- 11. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at 
    BEFORE UPDATE ON daily_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trial_sessions_updated_at 
    BEFORE UPDATE ON trial_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample premium user
INSERT INTO users (user_id, email, name, subscription_status, is_premium, subscription_start_date)
VALUES (
    'premium_user_123',
    'dakshmalhotra930@gmail.com',
    'Daksh Malhotra',
    'PRO',
    TRUE,
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    subscription_status = 'PRO',
    is_premium = TRUE,
    updated_at = NOW();

-- Insert sample free user
INSERT INTO users (user_id, email, name, subscription_status, is_premium)
VALUES (
    'free_user_456',
    'typouser2@gmail.com',
    'Test User',
    'FREE',
    FALSE
) ON CONFLICT (email) DO UPDATE SET
    subscription_status = 'FREE',
    is_premium = FALSE,
    updated_at = NOW();

-- =====================================================
-- 13. API ENDPOINTS (SUPABASE FUNCTIONS)
-- =====================================================

-- Create API function for checking user features
CREATE OR REPLACE FUNCTION api_get_user_features(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM get_user_features(
        (SELECT email FROM users WHERE user_id = p_user_id)
    );
    
    RETURN json_build_object(
        'user_id', result.user_id,
        'features', result.features,
        'subscription_status', result.subscription_status,
        'trial_sessions_remaining', result.trial_sessions_remaining,
        'has_pro_access', result.has_pro_access
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create API function for using trial session
CREATE OR REPLACE FUNCTION api_use_trial_session(p_user_id TEXT, p_feature TEXT)
RETURNS JSON AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM use_trial_session(p_user_id, p_feature);
    
    RETURN json_build_object(
        'success', result.success,
        'message', result.message,
        'trial_sessions_remaining', result.trial_sessions_remaining,
        'sessions_remaining', result.sessions_remaining,
        'feature', result.feature,
        'upgrade_required', result.upgrade_required
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create API function for tracking usage
CREATE OR REPLACE FUNCTION api_track_usage(
    p_user_id TEXT,
    p_feature_name TEXT,
    p_session_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    can_use BOOLEAN;
BEGIN
    SELECT track_feature_usage(p_user_id, p_feature_name, p_session_id, p_metadata) INTO can_use;
    
    RETURN json_build_object(
        'success', can_use,
        'message', CASE WHEN can_use THEN 'Usage tracked successfully' ELSE 'Usage limit reached' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create API function for getting usage status
CREATE OR REPLACE FUNCTION api_get_usage_status(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM get_usage_status(
        (SELECT email FROM users WHERE user_id = p_user_id)
    );
    
    RETURN json_build_object(
        'userType', result.user_type,
        'usageCount', result.usage_count,
        'usageLimit', result.usage_limit,
        'canUseFeature', result.can_use_feature,
        'lastUsedAt', result.last_used_at,
        'resetTime', result.reset_time,
        'isPremium', result.is_premium
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION api_get_user_features(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION api_use_trial_session(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION api_track_usage(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION api_get_usage_status(TEXT) TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_usage TO authenticated;
GRANT SELECT, INSERT ON feature_usage_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON trial_sessions TO authenticated;
GRANT SELECT ON subscription_features TO authenticated;

-- =====================================================
-- 15. SETUP COMPLETE
-- =====================================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'PRAXIS AI USER MANAGEMENT SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created: users, daily_usage, feature_usage_logs, trial_sessions, subscription_features';
    RAISE NOTICE 'Functions created: is_premium_user, get_user_features, track_feature_usage, use_trial_session, get_usage_status';
    RAISE NOTICE 'API functions created: api_get_user_features, api_use_trial_session, api_track_usage, api_get_usage_status';
    RAISE NOTICE 'Sample data inserted for testing';
    RAISE NOTICE '=====================================================';
END $$;
