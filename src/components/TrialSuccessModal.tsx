import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Crown } from 'lucide-react';

interface TrialSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  trialSessionsRemaining: number;
  onUpgrade?: () => void;
}

export const TrialSuccessModal: React.FC<TrialSuccessModalProps> = ({
  isOpen,
  onClose,
  featureName,
  trialSessionsRemaining,
  onUpgrade
}) => {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/pricing';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md modal-content">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center">Trial Session Used</DialogTitle>
          <DialogDescription className="text-center">
            You can now access {featureName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Message */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <p className="text-sm font-medium text-green-800 mb-2">
                Trial session activated successfully!
              </p>
              <Badge variant="outline" className="border-green-300 text-green-700">
                <Zap className="w-3 h-3 mr-1" />
                {trialSessionsRemaining} trials remaining
              </Badge>
            </div>
          </div>

          {/* Feature Access */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You now have access to:
            </p>
            <div className="p-3 bg-primary/10 rounded-lg">
              <span className="font-medium text-primary">
                {featureName}
              </span>
            </div>
          </div>

          {/* Upgrade Prompt */}
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-yellow-800">
                Enjoy unlimited access with Pro!
              </p>
              <p className="text-xs text-yellow-600">
                Get unlimited trials and premium features
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Continue
            </Button>
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
