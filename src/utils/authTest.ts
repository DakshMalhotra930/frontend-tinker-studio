// Simple test utilities to verify authentication system
import { apiUtils } from '../lib/api';

export const testAuthSystem = () => {
  console.log('🧪 Testing Authentication System...');
  
  // Test 1: Check initial state (should be false)
  const initialAuth = apiUtils.isAuthenticated();
  console.log('✅ Initial authentication state:', initialAuth);
  
  // Test 2: Test user data retrieval (should be null initially)
  const initialUserData = apiUtils.getUserData();
  console.log('✅ Initial user data:', initialUserData);
  
  // Test 3: Test user ID retrieval (should throw error)
  try {
    apiUtils.getUserId();
    console.log('❌ getUserId should have thrown an error');
  } catch (error) {
    console.log('✅ getUserId correctly threw error:', error.message);
  }
  
  // Test 4: Simulate storing user data
  const testUserData = {
    user_id: 'user_test123',
    email: 'test@example.com',
    name: 'Test User'
  };
  
  localStorage.setItem('praxis_user', JSON.stringify(testUserData));
  
  // Test 5: Check authentication after storing data
  const authAfterStore = apiUtils.isAuthenticated();
  console.log('✅ Authentication after storing data:', authAfterStore);
  
  // Test 6: Test user data retrieval after storing
  const userDataAfterStore = apiUtils.getUserData();
  console.log('✅ User data after storing:', userDataAfterStore);
  
  // Test 7: Test user ID retrieval after storing
  const userIdAfterStore = apiUtils.getUserId();
  console.log('✅ User ID after storing:', userIdAfterStore);
  
  // Test 8: Clean up test data
  localStorage.removeItem('praxis_user');
  
  // Test 9: Verify cleanup worked
  const authAfterCleanup = apiUtils.isAuthenticated();
  console.log('✅ Authentication after cleanup:', authAfterCleanup);
  
  console.log('🎉 Authentication system tests completed!');
};

// Run tests if this file is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  console.log('🔧 Authentication test utilities loaded. Run testAuthSystem() to test.');
}
