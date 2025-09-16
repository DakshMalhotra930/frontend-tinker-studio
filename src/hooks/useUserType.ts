import { useState, useEffect, useCallback } from 'react';

export interface UserTypeInfo {
  isPremium: boolean;
  userType: 'free' | 'premium';
  email: string | null;
  name: string | null;
}

const PREMIUM_EMAIL = 'dakshmalhotra930@gmail.com';

export const useUserType = (): UserTypeInfo => {
  const [userTypeInfo, setUserTypeInfo] = useState<UserTypeInfo>({
    isPremium: false,
    userType: 'free',
    email: null,
    name: null
  });

  const checkUserType = useCallback((): void => {
    try {
      const userData = localStorage.getItem('praxis_user');
      if (userData) {
        const user = JSON.parse(userData);
        const isPremium = user.email === PREMIUM_EMAIL;
        
        setUserTypeInfo({
          isPremium,
          userType: isPremium ? 'premium' : 'free',
          email: user.email,
          name: user.name
        });
      } else {
        setUserTypeInfo({
          isPremium: false,
          userType: 'free',
          email: null,
          name: null
        });
      }
    } catch (error) {
      console.error('Failed to check user type:', error);
      setUserTypeInfo({
        isPremium: false,
        userType: 'free',
        email: null,
        name: null
      });
    }
  }, []);

  useEffect(() => {
    checkUserType();
    
    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = () => {
      checkUserType();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkUserType]);

  return userTypeInfo;
};
