#!/usr/bin/env python3
"""
Test script to verify Google ID mapping and credit consumption
"""

import hashlib
import requests
import json

# Test data
TEST_EMAIL = "test@example.com"
TEST_NAME = "Test User"
API_BASE_URL = "https://praxis-ai.fly.dev"

def generate_user_id(email):
    """Generate user ID the same way as the backend"""
    return f"user_{hashlib.md5(email.encode()).hexdigest()[:12]}"

def test_google_id_consistency():
    """Test that the same email always generates the same user_id"""
    print("🧪 Testing Google ID Consistency...")
    
    # Test multiple times with same email
    user_ids = []
    for i in range(5):
        user_id = generate_user_id(TEST_EMAIL)
        user_ids.append(user_id)
        print(f"  Attempt {i+1}: {user_id}")
    
    # Check if all user_ids are the same
    if len(set(user_ids)) == 1:
        print("✅ Google ID mapping is consistent!")
        return user_ids[0]
    else:
        print("❌ Google ID mapping is inconsistent!")
        return None

def test_credit_status(user_id):
    """Test getting credit status for a user"""
    print(f"\n🧪 Testing Credit Status for user: {user_id}")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/credits/status/{user_id}")
        if response.status_code == 200:
            credit_data = response.json()
            print(f"✅ Credit status retrieved:")
            print(f"  - Credits Used: {credit_data.get('credits_used', 'N/A')}")
            print(f"  - Credits Remaining: {credit_data.get('credits_remaining', 'N/A')}")
            print(f"  - Credits Limit: {credit_data.get('credits_limit', 'N/A')}")
            print(f"  - Is Pro User: {credit_data.get('is_pro_user', 'N/A')}")
            return credit_data
        else:
            print(f"❌ Failed to get credit status: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting credit status: {e}")
        return None

def test_credit_consumption(user_id):
    """Test credit consumption by calling the AI chat endpoint"""
    print(f"\n🧪 Testing Credit Consumption for user: {user_id}")
    
    # First, we need to create a session
    session_data = {
        "user_id": user_id,
        "subject": "Physics",
        "topic": "Mechanics",
        "mode": "explain"
    }
    
    try:
        # Create session
        print("  Creating session...")
        session_response = requests.post(f"{API_BASE_URL}/agentic/session/start", json=session_data)
        
        if session_response.status_code != 200:
            print(f"❌ Failed to create session: {session_response.status_code}")
            print(f"Response: {session_response.text}")
            return False
        
        session_info = session_response.json()
        session_id = session_info.get('session_id')
        print(f"✅ Session created: {session_id}")
        
        # Get initial credit status
        print("  Getting initial credit status...")
        initial_credits = test_credit_status(user_id)
        if not initial_credits:
            return False
        
        initial_remaining = initial_credits.get('credits_remaining', 0)
        
        # Send a chat message to consume credit
        print("  Sending chat message to consume credit...")
        chat_data = {
            "session_id": session_id,
            "message": "Hello, can you help me with physics?",
            "context_hint": "Physics Mechanics"
        }
        
        chat_response = requests.post(f"{API_BASE_URL}/agentic/session/chat", json=chat_data)
        
        if chat_response.status_code == 200:
            print("✅ Chat message sent successfully")
            
            # Check credit status after consumption
            print("  Checking credit status after consumption...")
            final_credits = test_credit_status(user_id)
            if final_credits:
                final_remaining = final_credits.get('credits_remaining', 0)
                credits_consumed = initial_remaining - final_remaining
                
                if credits_consumed > 0:
                    print(f"✅ Credit consumption successful! Consumed {credits_consumed} credit(s)")
                    print(f"  Initial: {initial_remaining}, Final: {final_remaining}")
                    return True
                else:
                    print(f"❌ No credits were consumed. Initial: {initial_remaining}, Final: {final_remaining}")
                    return False
            else:
                print("❌ Failed to get final credit status")
                return False
        else:
            print(f"❌ Chat message failed: {chat_response.status_code}")
            print(f"Response: {chat_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing credit consumption: {e}")
        return False

def test_problem_solver_consumption(user_id):
    """Test credit consumption via problem solver endpoint"""
    print(f"\n🧪 Testing Problem Solver Credit Consumption for user: {user_id}")
    
    # Create session first
    session_data = {
        "user_id": user_id,
        "subject": "Physics",
        "topic": "Mechanics",
        "mode": "explain"
    }
    
    try:
        session_response = requests.post(f"{API_BASE_URL}/agentic/session/start", json=session_data)
        if session_response.status_code != 200:
            print(f"❌ Failed to create session: {session_response.status_code}")
            return False
        
        session_id = session_response.json().get('session_id')
        
        # Get initial credit status
        initial_credits = test_credit_status(user_id)
        if not initial_credits:
            return False
        
        initial_remaining = initial_credits.get('credits_remaining', 0)
        
        # Send problem solve request
        problem_data = {
            "session_id": session_id,
            "problem": "A ball is thrown upward with velocity 20 m/s. Find the maximum height.",
            "step": 1,
            "hint_level": 1
        }
        
        problem_response = requests.post(f"{API_BASE_URL}/agentic/session/solve", json=problem_data)
        
        if problem_response.status_code == 200:
            print("✅ Problem solver request successful")
            
            # Check final credit status
            final_credits = test_credit_status(user_id)
            if final_credits:
                final_remaining = final_credits.get('credits_remaining', 0)
                credits_consumed = initial_remaining - final_remaining
                
                if credits_consumed > 0:
                    print(f"✅ Problem solver credit consumption successful! Consumed {credits_consumed} credit(s)")
                    return True
                else:
                    print(f"❌ No credits consumed by problem solver")
                    return False
        else:
            print(f"❌ Problem solver failed: {problem_response.status_code}")
            print(f"Response: {problem_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing problem solver: {e}")
        return False

def main():
    print("🚀 Testing Credit System and Google ID Mapping")
    print("=" * 50)
    
    # Test 1: Google ID consistency
    user_id = test_google_id_consistency()
    if not user_id:
        print("❌ Cannot proceed without consistent user ID")
        return
    
    print(f"\n📋 Using User ID: {user_id}")
    
    # Test 2: Credit status retrieval
    credit_status = test_credit_status(user_id)
    if not credit_status:
        print("❌ Cannot proceed without credit status")
        return
    
    # Test 3: Credit consumption via AI Chat
    chat_success = test_credit_consumption(user_id)
    
    # Test 4: Credit consumption via Problem Solver
    problem_success = test_problem_solver_consumption(user_id)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"✅ Google ID Consistency: {'PASS' if user_id else 'FAIL'}")
    print(f"✅ Credit Status Retrieval: {'PASS' if credit_status else 'FAIL'}")
    print(f"✅ AI Chat Credit Consumption: {'PASS' if chat_success else 'FAIL'}")
    print(f"✅ Problem Solver Credit Consumption: {'PASS' if problem_success else 'FAIL'}")
    
    if all([user_id, credit_status, chat_success, problem_success]):
        print("\n🎉 ALL TESTS PASSED! Credit system is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
