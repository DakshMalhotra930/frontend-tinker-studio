import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatus } from '@/lib/api';

interface ProFeatureLockProps {
  feature: string;
  children: React.ReactNode;
  onUpgrade?: () => void;
  onUseTrial?: () => void;
  showTrialOption?: boolean;
}

export const ProFeatureLock: React.FC<ProFeatureLockProps> = ({
  feature,
  children,
  onUpgrade,
  onUseTrial,
  showTrialOption = true
}) => {
  const { subscription, canAccessFeature, hasTrialSessions } = useSubscription();

  // If user has access to the feature, show the children
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  // If user doesn't have access, show the lock overlay
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
              <h3 className="text-lg font-semibold">Pro Feature Locked</h3>
              <p className="text-sm text-muted-foreground">
                This feature requires a Pro subscription
              </p>
            </div>

            {/* Feature badge */}
            <Badge variant="outline" className="border-primary/30 text-primary">
              {feature.replace('_', ' ').toUpperCase()}
            </Badge>

            {/* Trial option for free users */}
            {subscription?.status === SubscriptionStatus.FREE && showTrialOption && hasTrialSessions() && (
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 text-orange-700">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {subscription.trial_sessions_limit - subscription.trial_sessions_used} trial sessions remaining
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={onUseTrial}
                  variant="outline" 
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Use Trial Session
                </Button>
              </div>
            )}

            {/* Upgrade option */}
            <div className="space-y-3">
              <Button 
                onClick={onUpgrade || (() => window.location.href = '/pricing')}
                className="w-full"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Get unlimited access to all features
              </div>
            </div>

            {/* Feature benefits */}
            <div className="pt-2 border-t space-y-2">
              <div className="text-sm font-medium">Pro Benefits:</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center space-x-2">
                  <ArrowRight className="w-3 h-3" />
                  <span>Unlimited sessions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowRight className="w-3 h-3" />
                  <span>Advanced AI features</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowRight className="w-3 h-3" />
                  <span>Priority support</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
