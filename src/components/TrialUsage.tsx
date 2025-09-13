import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatus } from '@/lib/api';
import { Zap, Crown, AlertCircle, CheckCircle } from 'lucide-react';

interface TrialUsageProps {
  feature: string;
  onUseTrial: () => Promise<void>;
  onUpgrade?: () => void;
}

export const TrialUsage: React.FC<TrialUsageProps> = ({
  feature,
  onUseTrial,
  onUpgrade
}) => {
  const { subscription, hasTrialSessions } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!subscription || subscription.status !== SubscriptionStatus.FREE) {
    return null;
  }

  const handleUseTrial = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onUseTrial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use trial session');
    } finally {
      setIsLoading(false);
    }
  };

  const remainingTrials = subscription.trial_sessions_limit - subscription.trial_sessions_used;
  const progressPercentage = (subscription.trial_sessions_used / subscription.trial_sessions_limit) * 100;

  if (remainingTrials <= 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong>No trial sessions remaining</strong>
                  <p className="text-sm mt-1">
                    You've used all {subscription.trial_sessions_limit} trial sessions for this feature.
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={onUpgrade || (() => window.location.href = '/pricing')}
                    className="flex-1"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Trial Session Available</span>
            </div>
            <div className="text-sm font-medium text-orange-700">
              {remainingTrials} remaining
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trial Usage</span>
              <span className="font-medium">
                {subscription.trial_sessions_used}/{subscription.trial_sessions_limit}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Feature info */}
          <div className="text-sm text-muted-foreground">
            Try <strong>{feature.replace('_', ' ')}</strong> with a free trial session
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <Button 
              onClick={handleUseTrial}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  <span>Using trial...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Use Trial Session</span>
                </div>
              )}
            </Button>
            
            <Button 
              onClick={onUpgrade || (() => window.location.href = '/pricing')}
              className="flex-1"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center">
            Trial sessions are limited and reset daily
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
