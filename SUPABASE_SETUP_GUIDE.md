# 🚀 Supabase Setup Guide for Praxis AI User Management

This guide will help you set up the complete backend infrastructure for your user management system with free/premium logic.

## 📋 Prerequisites

1. **Supabase Account**: Create one at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project
3. **Node.js**: For installing Supabase CLI (optional but recommended)

## 🔧 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Note down your:
   - Project URL
   - Anon key (public key)
   - Service role key (secret key)

## 🗄️ Step 2: Run the SQL Script

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste** the entire contents of `supabase_setup.sql`
4. **Click "Run"** to execute the script

This will create:
- ✅ 5 tables (users, daily_usage, feature_usage_logs, trial_sessions, subscription_features)
- ✅ 8 functions for business logic
- ✅ 4 API functions for frontend integration
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Sample data for testing

## 🔑 Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Service role key for admin operations
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Find these values in:**
- Supabase Dashboard → Settings → API
- Project URL: `https://your-project-id.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 📦 Step 4: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## 🔄 Step 5: Update Your API Integration

Replace your existing API calls with the Supabase integration:

### Option A: Use the provided integration file
1. Copy `supabase_api_integration.ts` to your project
2. Update your imports to use the new API functions

### Option B: Update existing files
Replace the API calls in your existing files:

**In `src/lib/api.ts`:**
```typescript
import { SupabaseUserAPI } from './supabase_api_integration';

// Replace existing functions with:
export const trialAPI = {
  checkUserFeatures: SupabaseUserAPI.getUserFeatures,
  useTrialSession: SupabaseUserAPI.useTrialSession,
  // ... other functions
};
```

## 🧪 Step 6: Test the Setup

### Test 1: Check Database Tables
1. Go to Supabase Dashboard → Table Editor
2. Verify these tables exist:
   - `users`
   - `daily_usage`
   - `feature_usage_logs`
   - `trial_sessions`
   - `subscription_features`

### Test 2: Check Sample Data
1. In Table Editor, check `users` table
2. You should see:
   - `dakshmalhotra930@gmail.com` (Premium user)
   - `typouser2@gmail.com` (Free user)

### Test 3: Test API Functions
1. Go to Supabase Dashboard → SQL Editor
2. Run this test query:
```sql
SELECT api_get_user_features('premium_user_123');
```

## 🎯 Step 7: Frontend Integration

### Update your hooks to use Supabase:

**In `src/hooks/useUsageTracking.ts`:**
```typescript
import { SupabaseUserAPI } from '../lib/supabase_api_integration';

// Replace localStorage logic with Supabase calls
const loadUsageStatus = useCallback(async () => {
  try {
    const userId = apiUtils.getUserId();
    if (!userId) return;
    
    const status = await SupabaseUserAPI.getUsageStatus(userId);
    setUsageStatus(status);
  } catch (error) {
    console.error('Failed to load usage status:', error);
    // Fallback to default free user
  }
}, []);
```

## 🔒 Step 8: Security Configuration

### Row Level Security (RLS) is already configured, but verify:

1. **Go to Supabase Dashboard → Authentication → Policies**
2. **Check that RLS is enabled** on all tables
3. **Verify policies** allow users to access only their own data

### API Security:
- All API functions use `SECURITY DEFINER`
- Users can only access their own data
- No sensitive operations are exposed

## 📊 Step 9: Monitor Usage

### View usage data:
1. **Supabase Dashboard → Table Editor → `feature_usage_logs`**
2. **View daily usage**: `daily_usage` table
3. **Check trial sessions**: `trial_sessions` table

### Analytics queries:
```sql
-- Daily usage by user
SELECT u.email, du.usage_count, du.usage_limit, du.usage_date
FROM daily_usage du
JOIN users u ON du.user_id = u.user_id
WHERE du.usage_date = CURRENT_DATE;

-- Most used features
SELECT feature_name, COUNT(*) as usage_count
FROM feature_usage_logs
WHERE used_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY feature_name
ORDER BY usage_count DESC;
```

## 🚨 Troubleshooting

### Common Issues:

1. **"Function not found" error**
   - Make sure you ran the complete SQL script
   - Check that functions exist in Supabase Dashboard → Functions

2. **"Permission denied" error**
   - Verify RLS policies are correct
   - Check that user is authenticated

3. **"User not found" error**
   - Make sure user exists in `users` table
   - Check user_id format matches

4. **Environment variables not working**
   - Restart your development server after adding env vars
   - Check that variable names start with `VITE_`

### Debug Steps:
1. Check Supabase Dashboard → Logs for errors
2. Use browser dev tools to inspect API calls
3. Test functions directly in SQL Editor

## 🎉 Success Indicators

You'll know the setup is working when:

✅ **Free users** see "3 of 5 used today"  
✅ **Premium users** see "Pro" badge  
✅ **Usage tracking** works across all features  
✅ **Trial sessions** are properly managed  
✅ **Upgrade prompts** appear when limits reached  
✅ **24-hour reset** works correctly  

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → Logs
2. Verify all SQL scripts ran successfully
3. Test API functions individually
4. Check environment variables are correct

---

## 🚀 Quick Start Checklist

- [ ] Create Supabase project
- [ ] Run `supabase_setup.sql` script
- [ ] Add environment variables
- [ ] Install `@supabase/supabase-js`
- [ ] Update API integration
- [ ] Test with sample users
- [ ] Deploy to production

**Your user management system is now ready! 🎉**
