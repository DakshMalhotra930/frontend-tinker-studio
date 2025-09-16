import React, { useState } from 'react';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { UsageLimitModal } from './UsageLimitModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Crown, Clock } from 'lucide-react';

interface FeatureWrapperProps {
  featureName: string;
  children: React.ReactNode;
  onFeatureUse?: () => void;
  sessionId?: string;
  showUsageDisplay?: boolean;
}

export const FeatureWrapper: React.FC<FeatureWrapperProps> = ({
  featureName,
  children,
  onFeatureUse,
  sessionId,
  showUsageDisplay = true
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
          <Card className="w-full max-w-md mx-4 border-primary/20">
            <CardContent className="p-6 text-center space-y-4">
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        onFeatureUse: handleFeatureUse
      })}
      
      <UsageLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={handleUpgrade}
        usageCount={usageStatus?.usageCount || 0}
        usageLimit={usageStatus?.usageLimit || 5}
        resetTime={usageStatus?.resetTime || null}
      />
    </>
  );
};
