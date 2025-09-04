import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Crown, Check, Sparkles, Zap, Star } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { toast } from 'sonner';

export const Pricing: React.FC = () => {
  const { pricing, subscription, upgradeSubscription, loading } = useSubscription();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime') => {
    try {
      setUpgrading(tier);
      const success = await upgradeSubscription(tier);
      
      if (success) {
        toast.success('Successfully upgraded to Pro!', {
          description: 'Welcome to the Pro experience!',
        });
      } else {
        toast.error('Upgrade failed', {
          description: 'Please try again or contact support.',
        });
      }
    } catch (error) {
      toast.error('Upgrade failed', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setUpgrading(null);
    }
  };

  if (loading || !pricing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pricing information...</p>
        </div>
      </div>
    );
  }

  const plans = [
    {
      name: 'Monthly',
      tier: 'pro_monthly' as const,
      price: pricing.monthly.price,
      currency: pricing.monthly.currency,
      features: pricing.monthly.features,
      popular: false,
    },
    {
      name: 'Yearly',
      tier: 'pro_yearly' as const,
      price: pricing.yearly.price,
      currency: pricing.yearly.currency,
      features: pricing.yearly.features,
      discount: pricing.yearly.discount,
      popular: true,
    },
    {
      name: 'Lifetime',
      tier: 'pro_lifetime' as const,
      price: pricing.lifetime.price,
      currency: pricing.lifetime.currency,
      features: pricing.lifetime.features,
      popular: false,
    },
  ];

  const isCurrentPlan = (tier: string) => {
    return subscription?.tier === tier;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of AI-powered learning with our Pro features
          </p>
        </div>

        {/* Current Status */}
        {subscription && (
          <div className="max-w-md mx-auto mb-8">
            <Card className="academic-card border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {subscription.status === 'pro' ? (
                      <Crown className="h-6 w-6 text-primary mr-2" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-amber-500 mr-2" />
                    )}
                    <span className="font-semibold">
                      {subscription.status === 'pro' ? 'Pro Member' : 'Free User'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.status === 'pro' 
                      ? 'You have access to all Pro features'
                      : `${subscription.trial_sessions_limit - subscription.trial_sessions_used} trial sessions remaining`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`academic-card relative ${
                plan.popular
                  ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5 scale-105'
                  : 'border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="academic" className="bg-gradient-to-r from-primary to-purple-500 text-white">
                    <Star className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.currency}</span>
                    <span className="text-4xl font-bold ml-1">{plan.price}</span>
                    {plan.name !== 'Lifetime' && (
                      <span className="text-muted-foreground ml-1">/{plan.name === 'Monthly' ? 'mo' : 'yr'}</span>
                    )}
                  </div>
                  {plan.discount && (
                    <Badge variant="success" className="mt-2">
                      {plan.discount} off
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90'
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={upgrading === plan.tier || isCurrentPlan(plan.tier)}
                >
                  {upgrading === plan.tier ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Upgrading...
                    </>
                  ) : isCurrentPlan(plan.tier) ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade to {plan.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Compare Features
          </h2>
          <Card className="academic-card">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4 flex items-center">
                    <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
                    Free Features
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Quick Help
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Study Plan Generation
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      3 Trial Sessions
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 flex items-center">
                    <Crown className="h-5 w-5 text-primary mr-2" />
                    Pro Features
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Deep Study Mode
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Advanced Quiz Generation
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Personalized Tutoring
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Unlimited Sessions
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Priority Support
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
