import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Loader2 } from 'lucide-react';
import { useTrialMode } from '@/hooks/useTrialMode';
import { apiUtils } from '@/lib/api';

interface TrialStatusDisplayProps {
  userId?: string;
  compact?: boolean;
  showUpgradeButton?: boolean;
}

export const TrialStatusDisplay: React.FC<TrialStatusDisplayProps> = ({
  userId,
  compact = false,
  showUpgradeButton = true
}) => {
  const {
    userFeatures,
    trialSessionsRemaining,
    subscriptionStatus,
    hasProAccess,
    isLoadingTrial,
    checkUserFeatures
  } = useTrialMode();

  const currentUserId = userId || apiUtils.getUserId();

  useEffect(() => {
    if (currentUserId) {
      checkUserFeatures(currentUserId);
    }
  }, [currentUserId, checkUserFeatures]);

  if (!currentUserId) {
    return null;
  }

  if (isLoadingTrial) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Check if user is premium by email
  const userEmail = currentUserId ? 
    JSON.parse(localStorage.getItem('praxis_user') || '{}').email : null;
  const isPremiumByEmail = userEmail === 'dakshmalhotra930@gmail.com';

  // Pro user display - only show if explicitly PRO or premium email
  if (subscriptionStatus === 'PRO' || hasProAccess || isPremiumByEmail) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white pro-status">
          <Crown className="w-3 h-3 mr-1" />
          Pro
        </Badge>
        {!compact && (
          <span className="text-sm text-muted-foreground">Unlimited Access</span>
        )}
      </div>
    );
  }

  // Free user display - default to free user if no data
  const displayTrialCount = trialSessionsRemaining || 10; // Default to 10 if no data
  
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground trial-count">
          {displayTrialCount} trials
        </span>
        {showUpgradeButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/pricing'}
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Trial Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Trial Sessions</span>
            <Badge variant="outline" className="trial-count">
              {trialSessionsRemaining} remaining
            </Badge>
          </div>

          {/* Status Message */}
          <div className="flex items-center space-x-2 text-orange-600">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">
              {trialSessionsRemaining > 0 ? 'Trials available' : 'No trials remaining'}
            </span>
          </div>

          {/* Upgrade Button */}
          {showUpgradeButton && (
            <Button 
              onClick={() => window.location.href = '/pricing'}
              className="w-full bg-gradient-to-r from-primary to-secondary"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          )}

          {/* Trial Info */}
          <div className="text-xs text-muted-foreground">
            <p>• 3 trial sessions per feature per day</p>
            <p>• 10 total trial sessions per day</p>
            <p>• Trials reset at midnight</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
