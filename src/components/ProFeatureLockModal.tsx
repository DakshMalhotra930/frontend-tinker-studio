import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap, AlertCircle, X } from 'lucide-react';
import { TrialSessionButton } from './TrialSessionButton';

interface ProFeatureLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  userId: string;
  onTrialSuccess: (result: any) => void;
  onTrialError: (error: string) => void;
  trialSessionsRemaining: number;
  isLoadingTrial: boolean;
  onUseTrial: (userId: string, featureName: string) => Promise<any>;
}

export const ProFeatureLockModal: React.FC<ProFeatureLockModalProps> = ({
  isOpen,
  onClose,
  featureName,
  userId,
  onTrialSuccess,
  onTrialError,
  trialSessionsRemaining,
  isLoadingTrial,
  onUseTrial
}) => {
  const handleTrialSuccess = (result: any) => {
    onTrialSuccess(result);
    onClose();
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md modal-content">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Pro Feature Locked</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            This feature requires a Pro subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="border-primary/30 text-primary px-3 py-1">
              {featureName.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Trial Option */}
          {trialSessionsRemaining > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-orange-700">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {trialSessionsRemaining} trial sessions remaining
                  </span>
                </div>
              </div>
              
              <TrialSessionButton
                userId={userId}
                featureName={featureName}
                onSuccess={handleTrialSuccess}
                onError={onTrialError}
                trialSessionsRemaining={trialSessionsRemaining}
                isLoading={isLoadingTrial}
                onUseTrial={onUseTrial}
                className="w-full"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    No trial sessions remaining
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          )}

          {/* Pro Benefits */}
          <div className="pt-2 border-t space-y-2">
            <div className="text-sm font-medium">Pro Benefits:</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Unlimited access to all features</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Priority AI responses</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>Advanced features</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>24/7 premium support</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
