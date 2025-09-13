import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier } from '@/lib/api';
import { Crown, Check, Zap, Star } from 'lucide-react';

interface PricingDisplayProps {
  onSelectPlan?: (tier: SubscriptionTier) => void;
  showCurrentPlan?: boolean;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
  onSelectPlan,
  showCurrentPlan = true
}) => {
  const { subscription, pricing, upgradeSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (onSelectPlan) {
      onSelectPlan(tier);
      return;
    }

    try {
      setIsLoading(tier);
      const success = await upgradeSubscription(tier);
      if (success) {
        // Handle success (maybe show toast or redirect)
        console.log('Upgrade successful');
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const getCurrentPlanBadge = (tier: SubscriptionTier) => {
    if (!showCurrentPlan || !subscription) return null;
    
    if (subscription.tier === tier) {
      return (
        <Badge variant="default" className="bg-green-600">
          <Check className="w-3 h-3 mr-1" />
          Current Plan
        </Badge>
      );
    }
    return null;
  };

  if (!pricing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Unlock the full potential of your AI tutor
        </p>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">
            Yearly
            <Badge variant="secondary" className="ml-2">Save 17%</Badge>
          </TabsTrigger>
          <TabsTrigger value="lifetime">Lifetime</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Free
                  {getCurrentPlanBadge(SubscriptionTier.FREE)}
                </CardTitle>
                <div className="text-2xl font-bold">$0<span className="text-sm font-normal">/month</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Interactive Syllabus</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Generate Questions (FREE)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Ask Questions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Problem Solver</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Casual Chat</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Image Solving</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span>3 Trial Sessions</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={subscription?.tier === SubscriptionTier.FREE}
                >
                  {subscription?.tier === SubscriptionTier.FREE ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Monthly */}
            <Card className="relative border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pro Monthly
                  <div className="flex space-x-2">
                    {getCurrentPlanBadge(SubscriptionTier.PRO_MONTHLY)}
                    <Badge variant="default" className="bg-primary">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${pricing.monthly.price}
                  <span className="text-sm font-normal">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Deep Study Mode</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Study Plan Generator</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Advanced Problem Solving</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Unlimited Sessions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Priority Support</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade(SubscriptionTier.PRO_MONTHLY)}
                  disabled={isLoading === SubscriptionTier.PRO_MONTHLY}
                  className="w-full"
                >
                  {isLoading === SubscriptionTier.PRO_MONTHLY ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Upgrading...</span>
                    </div>
                  ) : subscription?.tier === SubscriptionTier.PRO_MONTHLY ? (
                    'Current Plan'
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4" />
                      <span>Upgrade to Pro</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="yearly">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Free
                  {getCurrentPlanBadge(SubscriptionTier.FREE)}
                </CardTitle>
                <div className="text-2xl font-bold">$0<span className="text-sm font-normal">/month</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Interactive Syllabus</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Generate Questions (FREE)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Ask Questions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Problem Solver</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Casual Chat</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Image Solving</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span>3 Trial Sessions</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={subscription?.tier === SubscriptionTier.FREE}
                >
                  {subscription?.tier === SubscriptionTier.FREE ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Yearly */}
            <Card className="relative border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pro Yearly
                  <div className="flex space-x-2">
                    {getCurrentPlanBadge(SubscriptionTier.PRO_YEARLY)}
                    <Badge variant="default" className="bg-green-600">
                      Save {pricing.yearly.discount}
                    </Badge>
                  </div>
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${(pricing.yearly.price / 12).toFixed(2)}
                  <span className="text-sm font-normal">/month</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Billed annually (${pricing.yearly.price})
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Deep Study Mode</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Study Plan Generator</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Advanced Problem Solving</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Unlimited Sessions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Priority Support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span>Early Access to New Features</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade(SubscriptionTier.PRO_YEARLY)}
                  disabled={isLoading === SubscriptionTier.PRO_YEARLY}
                  className="w-full"
                >
                  {isLoading === SubscriptionTier.PRO_YEARLY ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Upgrading...</span>
                    </div>
                  ) : subscription?.tier === SubscriptionTier.PRO_YEARLY ? (
                    'Current Plan'
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4" />
                      <span>Upgrade to Pro</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lifetime">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Free
                  {getCurrentPlanBadge(SubscriptionTier.FREE)}
                </CardTitle>
                <div className="text-2xl font-bold">$0<span className="text-sm font-normal">/month</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Interactive Syllabus</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Generate Questions (FREE)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Ask Questions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Problem Solver</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Casual Chat</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Image Solving</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span>3 Trial Sessions</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={subscription?.tier === SubscriptionTier.FREE}
                >
                  {subscription?.tier === SubscriptionTier.FREE ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Lifetime */}
            <Card className="relative border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pro Lifetime
                  <div className="flex space-x-2">
                    {getCurrentPlanBadge(SubscriptionTier.PRO_LIFETIME)}
                    <Badge variant="default" className="bg-purple-600">
                      <Star className="w-3 h-3 mr-1" />
                      Best Value
                    </Badge>
                  </div>
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${pricing.lifetime.price}
                  <span className="text-sm font-normal"> one-time</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Lifetime Access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>All Future Features</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>VIP Support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span>Early Access to Beta Features</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade(SubscriptionTier.PRO_LIFETIME)}
                  disabled={isLoading === SubscriptionTier.PRO_LIFETIME}
                  className="w-full"
                >
                  {isLoading === SubscriptionTier.PRO_LIFETIME ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Upgrading...</span>
                    </div>
                  ) : subscription?.tier === SubscriptionTier.PRO_LIFETIME ? (
                    'Current Plan'
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4" />
                      <span>Upgrade to Lifetime</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
