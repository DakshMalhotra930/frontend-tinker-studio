import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/api';
import { Crown, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface SubscriptionStatusProps {
  compact?: boolean;
  showUpgradeButton?: boolean;
}

export const SubscriptionStatusComponent: React.FC<SubscriptionStatusProps> = ({
  compact = false,
  showUpgradeButton = true
}) => {
  const { subscription, loading, error } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Error loading subscription</span>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const getStatusBadge = () => {
    switch (subscription.status) {
      case SubscriptionStatus.PRO:
        return (
          <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-yellow-600">
            <Crown className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        );
      case SubscriptionStatus.FREE:
        return (
          <Badge variant="secondary">
            Free
          </Badge>
        );
      case SubscriptionStatus.TRIAL:
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            <Zap className="w-3 h-3 mr-1" />
            Trial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {subscription.status}
          </Badge>
        );
    }
  };

  const getTrialProgress = () => {
    if (subscription.status !== SubscriptionStatus.FREE) return null;
    
    const used = subscription.trial_sessions_used;
    const limit = subscription.trial_sessions_limit;
    const percentage = (used / limit) * 100;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Trial Sessions</span>
          <span className="font-medium">{used}/{limit}</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusBadge()}
        {subscription.status === SubscriptionStatus.FREE && getTrialProgress()}
        {showUpgradeButton && subscription.status === SubscriptionStatus.FREE && (
          <Button size="sm" variant="outline" onClick={() => window.location.href = '/pricing'}>
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Subscription Status
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.status === SubscriptionStatus.PRO && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Pro Features Active</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Access to all premium features
            </div>
            {subscription.expires_at && (
              <div className="text-xs text-muted-foreground">
                Expires: {new Date(subscription.expires_at).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {subscription.status === SubscriptionStatus.FREE && (
          <div className="space-y-3">
            {getTrialProgress()}
            <div className="text-sm text-muted-foreground">
              Upgrade to Pro for unlimited access to all features
            </div>
            {showUpgradeButton && (
              <Button 
                className="w-full" 
                onClick={() => window.location.href = '/pricing'}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        )}

        {subscription.status === SubscriptionStatus.TRIAL && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-orange-600">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Trial Active</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Enjoying Pro features during trial period
            </div>
            {subscription.expires_at && (
              <div className="text-xs text-muted-foreground">
                Trial expires: {new Date(subscription.expires_at).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Available Features: {subscription.features.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};