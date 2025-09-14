import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Clock, AlertCircle, Zap } from 'lucide-react';

interface UsageProgressDisplayProps {
  usageCount: number;
  usageLimit: number;
  lastUsedAt: string | null;
  resetTime: string | null;
  isPremium: boolean;
  onUpgrade?: () => void;
  compact?: boolean;
}

export const UsageProgressDisplay: React.FC<UsageProgressDisplayProps> = ({
  usageCount,
  usageLimit,
  lastUsedAt,
  resetTime,
  isPremium,
  onUpgrade,
  compact = false
}) => {
  const usagePercentage = (usageCount / usageLimit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usageCount >= usageLimit;
  const remainingUses = usageLimit - usageCount;

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

  // Premium user display
  if (isPremium) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <Crown className="w-3 h-3 mr-1" />
          Pro
        </Badge>
        {!compact && (
          <span className="text-sm text-muted-foreground">Unlimited Access</span>
        )}
      </div>
    );
  }

  // Free user display
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          {usageCount}/{usageLimit} used
        </span>
        <div className="w-16">
          <Progress 
            value={usagePercentage} 
            className={`h-2 ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : ''}`}
          />
        </div>
        {isAtLimit && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
        {onUpgrade && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpgrade}
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Usage Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Daily Usage</span>
          <span className="text-sm text-muted-foreground">
            {usageCount} of {usageLimit} used
          </span>
        </div>
        <Progress 
          value={usagePercentage} 
          className={`h-2 ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : ''}`}
        />
      </div>

      {/* Status Message */}
      {isAtLimit ? (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Daily limit reached</span>
        </div>
      ) : isNearLimit ? (
        <div className="flex items-center space-x-2 text-yellow-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Almost at limit</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-green-600">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">{remainingUses} uses remaining</span>
        </div>
      )}

      {/* Reset Time */}
      {resetTime && (
        <div className="text-xs text-muted-foreground">
          Resets in: {formatResetTime(resetTime)}
        </div>
      )}

      {/* Upgrade Button */}
      {isAtLimit && onUpgrade && (
        <Button 
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-primary to-secondary"
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to Pro
        </Button>
      )}
    </div>
  );
};
