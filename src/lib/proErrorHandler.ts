import { APIError } from './api';
import { toast } from '../hooks/use-toast';

export interface ProAccessError {
  isProError: boolean;
  message: string;
  upgradePrompt?: string;
  trialAvailable?: boolean;
}

export const handleProAccessError = (error: unknown): ProAccessError => {
  if (error instanceof APIError) {
    // Check if it's a Pro access error (HTTP 403)
    if (error.status === 403) {
      const message = error.message.toLowerCase();
      
      // Check for trial limit reached
      if (message.includes('trial') && message.includes('limit')) {
        return {
          isProError: true,
          message: 'Trial sessions exhausted',
          upgradePrompt: 'You have used all your trial sessions. Upgrade to Pro for unlimited access.',
          trialAvailable: false,
        };
      }
      
      // Check for Pro feature access
      if (message.includes('pro') || message.includes('subscription') || message.includes('upgrade')) {
        return {
          isProError: true,
          message: 'Pro feature access required',
          upgradePrompt: 'This feature requires a Pro subscription. Upgrade now to unlock all features.',
          trialAvailable: true,
        };
      }
      
      // Generic Pro access error
      return {
        isProError: true,
        message: 'Access denied',
        upgradePrompt: 'This feature requires Pro access. Upgrade to continue.',
        trialAvailable: true,
      };
    }
  }
  
  // Not a Pro access error
  return {
    isProError: false,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
};

export const showProAccessToast = (proError: ProAccessError) => {
  if (!proError.isProError) return;
  
  toast({
    title: proError.message,
    description: proError.upgradePrompt,
    variant: 'destructive',
  });
};

export const handleApiError = (error: unknown) => {
  const proError = handleProAccessError(error);
  
  if (proError.isProError) {
    showProAccessToast(proError);
  } else {
    toast({
      title: 'Error',
      description: proError.message,
      variant: 'destructive',
    });
  }
};
