import React, { useState } from 'react';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { UsageProgressDisplay } from './UsageProgressDisplay';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Clock, AlertCircle } from 'lucide-react';

interface FeatureUsageTrackerProps {
  featureName: string;
  children: React.ReactNode;
  onFeatureUse?: () => void;
  sessionId?: string;
}

export const FeatureUsageTracker: React.FC<FeatureUsageTrackerProps> = ({
  featureName,
  children,
  onFeatureUse,
  sessionId
}) => {
  const { usageStatus, trackUsage, loading } = useUsageTracking();
  const [showLimitModal, setShowLimitModal] = useState(false);

  const handleFeatureUse = async () => {
    if (!usageStatus) return;

    // Premium users can always use features
    if (usageStatus.isPremium) {
      onFeatureUse?.();
      return;
    }

    // Check if free user can use feature
    if (!usageStatus.canUseFeature) {
      setShowLimitModal(true);
      return;
    }

    // Track usage and proceed
    const success = await trackUsage(featureName, sessionId);
    if (success) {
      onFeatureUse?.();
    } else {
      console.error('Failed to track usage');
    }
  };

  const handleUpgrade = () => {
    setShowLimitModal(false);
    window.location.href = '/pricing';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user can't use feature, show lock overlay
  if (usageStatus && !usageStatus.isPremium && !usageStatus.canUseFeature) {
    return (
      <div className="relative">
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none select-none">
          {children}
        </div>
        
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="w-full max-w-md mx-4 p-6 bg-card rounded-lg border border-primary/20 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Daily Limit Reached</h3>
              <p className="text-sm text-muted-foreground">
                You've used all {usageStatus.usageLimit} features today
              </p>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-orange-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Resets in {usageStatus.resetTime ? 
                    Math.ceil((new Date(usageStatus.resetTime).getTime() - new Date().getTime()) / (1000 * 60 * 60)) + ' hours' : 
                    '24 hours'
                  }
                </span>
              </div>
            </div>

            <Button 
              onClick={() => setShowLimitModal(true)}
              className="w-full"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        onFeatureUse: handleFeatureUse
      })}
      
      {/* Usage Limit Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Daily Limit Reached</DialogTitle>
            </div>
            <DialogDescription>
              You've used all {usageStatus?.usageLimit || 5} features today
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Usage */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-800">Today's Usage</span>
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  {usageStatus?.usageCount || 0}/{usageStatus?.usageLimit || 5}
                </Badge>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full" 
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-xs text-orange-600 mt-2">
                Resets in {usageStatus?.resetTime ? 
                  Math.ceil((new Date(usageStatus.resetTime).getTime() - new Date().getTime()) / (1000 * 60 * 60)) + ' hours' : 
                  '24 hours'
                }
              </p>
            </div>

            {/* Pro Benefits */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Upgrade to Pro and get:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  <span>Unlimited daily usage</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  <span>Priority AI responses</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  <span>Advanced features</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  <span>24/7 premium support</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
              <Button 
                onClick={() => setShowLimitModal(false)}
                variant="outline"
                className="flex-1"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
