import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, Zap, CheckCircle, Star } from 'lucide-react';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  usageCount: number;
  usageLimit: number;
  resetTime: string | null;
}

export const UsageLimitModal: React.FC<UsageLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  usageCount,
  usageLimit,
  resetTime
}) => {
  const formatResetTime = (resetTime: string | null): string => {
    if (!resetTime) return '24 hours from now';
    const reset = new Date(resetTime);
    const now = new Date();
    const diffMs = reset.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Now';
    if (diffHours === 1) return '1 hour';
    return `${diffHours} hours`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>Daily Limit Reached</span>
          </DialogTitle>
          <DialogDescription>
            You've used all {usageLimit} of your daily features. Upgrade to Pro for unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Usage */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-800">Today's Usage</span>
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {usageCount}/{usageLimit}
              </Badge>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full" 
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Resets in {formatResetTime(resetTime)}
            </p>
          </div>

          {/* Pro Benefits */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Upgrade to Pro and get:</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Unlimited daily usage</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Priority AI responses</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Advanced features</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>24/7 premium support</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={onUpgrade}
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>

          {/* Pro Badge Preview */}
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Pro users get this badge:</span>
            </div>
            <div className="mt-2">
              <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Pro
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
