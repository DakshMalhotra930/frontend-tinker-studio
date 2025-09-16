import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';

interface TrialSessionButtonProps {
  userId: string;
  featureName: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
  trialSessionsRemaining: number;
  isLoading: boolean;
  onUseTrial: (userId: string, featureName: string) => Promise<any>;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TrialSessionButton: React.FC<TrialSessionButtonProps> = ({
  userId,
  featureName,
  onSuccess,
  onError,
  trialSessionsRemaining,
  isLoading,
  onUseTrial,
  className = '',
  variant = 'default',
  size = 'default'
}) => {
  const handleClick = async () => {
    if (isLoading || trialSessionsRemaining <= 0) return;
    
    try {
      const result = await onUseTrial(userId, featureName);
      if (result?.success) {
        onSuccess(result);
      } else {
        onError(result?.message || 'Failed to use trial session');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return 'Using Trial...';
    }
    
    if (trialSessionsRemaining <= 0) {
      return 'No trials remaining';
    }
    
    return `${trialSessionsRemaining} trial sessions remaining`;
  };

  const isDisabled = isLoading || trialSessionsRemaining <= 0;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={`trial-button ${isDisabled ? 'trial-button:disabled' : ''} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Using Trial...
        </>
      ) : (
        <>
          <Zap className="w-4 h-4 mr-2" />
          {getButtonText()}
        </>
      )}
    </Button>
  );
};
