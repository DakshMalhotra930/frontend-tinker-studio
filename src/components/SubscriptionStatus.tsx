import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Crown, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { format } from 'date-fns';

interface SubscriptionStatusProps {
  showUpgradeButton?: boolean;
  onUpgrade?: () => void;
  compact?: boolean;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  showUpgradeButton = false,
  onUpgrade,
  compact = false,
}) => {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'pro':
        return (
          <Badge variant="academic" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
            <Crown className="mr-1 h-3 w-3" />
            Pro
          </Badge>
        );
      case 'trial':
        return (
          <Badge variant="academic" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            Trial
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <Clock className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <CheckCircle className="mr-1 h-3 w-3" />
            Free
          </Badge>
        );
    }
  };

  const getTrialInfo = () => {
    if (subscription.status === 'free' || subscription.status === 'trial') {
      const remaining = subscription.trial_sessions_limit - subscription.trial_sessions_used;
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>{remaining} trial sessions left</span>
        </div>
      );
    }
    return null;
  };

  const getExpiryInfo = () => {
    if (subscription.expires_at && subscription.status === 'pro') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Expires {format(new Date(subscription.expires_at), 'MMM d, yyyy')}</span>
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {getTrialInfo()}
        {showUpgradeButton && subscription.status === 'free' && onUpgrade && (
          <Button
            size="sm"
            variant="academic"
            onClick={onUpgrade}
            className="h-6 px-2 text-xs"
          >
            <Crown className="mr-1 h-3 w-3" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-sm font-medium">
            {subscription.tier.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
        {showUpgradeButton && subscription.status === 'free' && onUpgrade && (
          <Button
            size="sm"
            variant="academic"
            onClick={onUpgrade}
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade
          </Button>
        )}
      </div>
      
      {getTrialInfo()}
      {getExpiryInfo()}
      
      <div className="text-xs text-muted-foreground">
        <div className="font-medium mb-1">Available Features:</div>
        <div className="flex flex-wrap gap-1">
          {subscription.features.map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
