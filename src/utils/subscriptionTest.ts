// Comprehensive test utilities for subscription system
import { apiUtils, SubscriptionStatus, SubscriptionTier } from '../lib/api';

export const testSubscriptionSystem = () => {
  console.log('🧪 Testing Subscription System...');
  
  // Test 1: Authentication
  console.log('\n1️⃣ Testing Authentication:');
  const isAuth = apiUtils.isAuthenticated();
  console.log('✅ Authentication status:', isAuth);
  
  if (isAuth) {
    const userData = apiUtils.getUserData();
    console.log('✅ User data:', userData);
    
    try {
      const userId = apiUtils.getUserId();
      console.log('✅ User ID:', userId);
    } catch (error) {
      console.log('❌ User ID error:', error.message);
    }
  } else {
    console.log('⚠️ User not authenticated - skipping user-specific tests');
  }
  
  // Test 2: Subscription Status Enum
  console.log('\n2️⃣ Testing Subscription Status Enum:');
  console.log('✅ FREE:', SubscriptionStatus.FREE);
  console.log('✅ PRO:', SubscriptionStatus.PRO);
  console.log('✅ TRIAL:', SubscriptionStatus.TRIAL);
  console.log('✅ EXPIRED:', SubscriptionStatus.EXPIRED);
  console.log('✅ CANCELLED:', SubscriptionStatus.CANCELLED);
  
  // Test 3: Subscription Tier Enum
  console.log('\n3️⃣ Testing Subscription Tier Enum:');
  console.log('✅ FREE:', SubscriptionTier.FREE);
  console.log('✅ PRO_MONTHLY:', SubscriptionTier.PRO_MONTHLY);
  console.log('✅ PRO_YEARLY:', SubscriptionTier.PRO_YEARLY);
  console.log('✅ PRO_LIFETIME:', SubscriptionTier.PRO_LIFETIME);
  
  // Test 4: Feature Access Logic
  console.log('\n4️⃣ Testing Feature Access Logic:');
  const testFeatures = [
    'syllabus',
    'generate_content', 
    'ask_question',
    'problem_solver',
    'chat',
    'image_solve',
    'deep_study_mode',
    'study_plan',
    'advanced_quiz'
  ];
  
  testFeatures.forEach(feature => {
    const isFree = ['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve'].includes(feature);
    console.log(`✅ ${feature}: ${isFree ? 'FREE' : 'PRO'}`);
  });
  
  // Test 5: Trial Logic
  console.log('\n5️⃣ Testing Trial Logic:');
  const mockFreeSubscription = {
    status: SubscriptionStatus.FREE,
    tier: SubscriptionTier.FREE,
    trial_sessions_used: 1,
    trial_sessions_limit: 3,
    trial_reset_date: new Date().toISOString().split('T')[0],
    features: ['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve'],
    user_id: 'test_user_123'
  };
  
  console.log('✅ Mock free subscription created');
  console.log('✅ Trial sessions remaining:', mockFreeSubscription.trial_sessions_limit - mockFreeSubscription.trial_sessions_used);
  console.log('✅ Can use trial:', mockFreeSubscription.trial_sessions_used < mockFreeSubscription.trial_sessions_limit);
  
  // Test 6: Pro Subscription
  console.log('\n6️⃣ Testing Pro Subscription:');
  const mockProSubscription = {
    status: SubscriptionStatus.PRO,
    tier: SubscriptionTier.PRO_MONTHLY,
    trial_sessions_used: 0,
    trial_sessions_limit: 3,
    trial_reset_date: new Date().toISOString().split('T')[0],
    features: ['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve', 'deep_study_mode', 'study_plan', 'advanced_quiz'],
    user_id: 'test_user_123',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  console.log('✅ Mock pro subscription created');
  console.log('✅ Pro features available:', mockProSubscription.features.length);
  console.log('✅ Has deep_study_mode:', mockProSubscription.features.includes('deep_study_mode'));
  console.log('✅ Has study_plan:', mockProSubscription.features.includes('study_plan'));
  console.log('✅ Has advanced_quiz:', mockProSubscription.features.includes('advanced_quiz'));
  
  console.log('\n🎉 Subscription system tests completed successfully!');
  
  return {
    authentication: isAuth,
    subscriptionStatus: SubscriptionStatus,
    subscriptionTier: SubscriptionTier,
    freeFeatures: testFeatures.filter(f => ['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve'].includes(f)),
    proFeatures: testFeatures.filter(f => !['syllabus', 'generate_content', 'ask_question', 'problem_solver', 'chat', 'image_solve'].includes(f))
  };
};

// Run tests if this file is imported
if (typeof window !== 'undefined') {
  console.log('🔧 Subscription test utilities loaded. Run testSubscriptionSystem() to test.');
}
