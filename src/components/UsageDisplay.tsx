import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Clock, Zap, AlertCircle } from 'lucide-react';
import { UsageStatus } from '@/hooks/useUsageTracking';

interface UsageDisplayProps {
  usageStatus: UsageStatus | null;
  onUpgrade?: () => void;
  compact?: boolean;
}

export const UsageDisplay: React.FC<UsageDisplayProps> = ({ 
  usageStatus, 
  onUpgrade, 
  compact = false 
}) => {
  if (!usageStatus) return null;

  // Premium user display
  if (usageStatus.isPremium) {
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
  const usagePercentage = (usageStatus.usageCount / usageStatus.usageLimit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = !usageStatus.canUseFeature;

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          {usageStatus.usageCount}/{usageStatus.usageLimit}
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
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Usage Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Daily Usage</span>
              <span className="text-sm text-muted-foreground">
                {usageStatus.usageCount} of {usageStatus.usageLimit}
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
              <span className="text-sm font-medium">Usage available</span>
            </div>
          )}

          {/* Reset Time */}
          {usageStatus.resetTime && (
            <div className="text-xs text-muted-foreground">
              Resets at: {new Date(usageStatus.resetTime).toLocaleTimeString()}
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
      </CardContent>
    </Card>
  );
};
