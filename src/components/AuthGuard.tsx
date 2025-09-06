import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px] p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <div className="space-y-4">
              <p>You need to be logged in to access this feature.</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
