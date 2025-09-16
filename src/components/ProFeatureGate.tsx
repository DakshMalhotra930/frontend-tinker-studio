import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lock, Crown, Sparkles, Zap } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface ProFeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgrade?: () => void;
  onUseTrial?: () => void;
}

export const ProFeatureGate: React.FC<ProFeatureGateProps> = ({
  feature,
  children,
  fallback,
  onUpgrade,
  onUseTrial,
}) => {
  const { subscription, canAccessFeature, hasTrialSessions, useTrialSession } = useSubscription();

  // If user can access the feature, render children
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  // If user has trial sessions available, show trial option
  if (hasTrialSessions() && onUseTrial) {
    return (
      <Card className="academic-card border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-amber-900">
            Try Pro Feature
          </CardTitle>
          <CardDescription className="text-amber-700">
            You have {subscription?.trial_sessions_limit_daily! - subscription?.trial_sessions_used_today!} trial sessions remaining today
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-amber-800">
            Experience the power of Pro features with daily trial sessions!
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={onUseTrial}
              variant="academic"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Zap className="mr-2 h-4 w-4" />
              Use Trial Session
            </Button>
            {onUpgrade && (
              <Button
                onClick={onUpgrade}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default locked state
  return (
    <Card className="academic-card border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-gray-500">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">
          Pro Feature Locked
        </CardTitle>
        <CardDescription className="text-slate-600">
          {feature.replace('_', ' ')} is available with Pro subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="space-y-2">
          <Badge variant="academic" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <Crown className="mr-1 h-3 w-3" />
            Pro Feature
          </Badge>
          <p className="text-slate-700">
            Unlock advanced AI tutoring, personalized study plans, and unlimited sessions
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          {onUpgrade && (
            <Button
              onClick={onUpgrade}
              variant="academic"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          )}
        </div>
        {fallback && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            {fallback}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
