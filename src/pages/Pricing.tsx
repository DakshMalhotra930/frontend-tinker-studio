import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Crown, Check, Sparkles, Zap, Star, BookOpen, Brain, Target, Users, Shield, Clock, ArrowRight, LogIn } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../hooks/use-toast';
import { SubscriptionTier } from '../lib/api';
import GoogleLogin from '../components/GoogleLogin';

const Pricing: React.FC = () => {
  const { subscription, upgradeSubscription, loading } = useSubscription();
  const { isAuthenticated, user, login } = useAuth();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    // If user is not authenticated, show login prompt
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to upgrade to Pro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpgrading(tier);
      const success = await upgradeSubscription(tier);
      
      if (success) {
        toast({
          title: 'Successfully upgraded to Pro!',
          description: 'Welcome to the Pro experience!',
        });
      } else {
        toast({
          title: 'Upgrade failed',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Upgrade failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(null);
    }
  };

  const handleLogin = (userData: any) => {
    login(userData);
  };

  if (loading && isAuthenticated) {
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
      name: 'Free',
      tier: SubscriptionTier.FREE,
      price: 0,
      currency: '₹',
      period: 'forever',
      description: 'Perfect for getting started with AI tutoring',
      features: [
        'Interactive JEE Syllabus Explorer',
        'Generate Practice Questions (FREE)',
        'Ask AI Questions & Get Answers',
        'Problem Solver with Step-by-Step Solutions',
        'Casual Chat with AI Tutor',
        'Image-based Problem Solving',
        '3 Trial Sessions for Pro Features',
        'Basic Study Plan Generation'
      ],
      popular: false,
      buttonText: isAuthenticated ? 'Current Plan' : 'Get Started Free',
      buttonVariant: 'outline' as const,
    },
    {
      name: 'Pro',
      tier: SubscriptionTier.PRO_MONTHLY,
      price: 99,
      currency: '₹',
      period: 'month',
      description: 'Unlock unlimited AI-powered learning',
      features: [
        'Everything in Free Plan',
        'Unlimited Deep Study Mode Sessions',
        'Advanced AI Tutoring & Mentoring',
        'Personalized Study Plans & Roadmaps',
        'Advanced Problem Solving with Hints',
        'Unlimited Trial Sessions',
        'Priority AI Response & Support',
        'Advanced Quiz Generation',
        'Progress Tracking & Analytics',
        'Early Access to New Features'
      ],
      popular: true,
      buttonText: isAuthenticated ? 'Upgrade to Pro' : 'Sign in to Upgrade',
      buttonVariant: 'default' as const,
    },
  ];

  const isCurrentPlan = (tier: string) => {
    return subscription?.tier === tier;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <Crown className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent mb-6">
              Choose Your Learning Journey
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Unlock the full potential of AI-powered JEE preparation with our comprehensive tutoring platform
            </p>
            
            {/* Current Status */}
            {isAuthenticated && subscription ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-full border border-border/50 mb-8">
                {subscription.status === 'pro' ? (
                  <Crown className="h-4 w-4 text-primary" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-medium">
                  {subscription.status === 'pro' ? 'Pro Member' : 'Free User'}
                </span>
                {subscription.status === 'free' && (
                  <span className="text-xs text-muted-foreground">
                    • {subscription.trial_sessions_limit - subscription.trial_sessions_used} trials left
                  </span>
                )}
              </div>
            ) : !isAuthenticated ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-full border border-border/50 mb-8">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Sign in to see your current plan
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`academic-card relative transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-secondary/5 scale-105 shadow-lg'
                  : 'border-border/50 hover:border-primary/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                    <Star className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-6 pt-8">
                <div className="flex items-center justify-center mb-4">
                  {plan.tier === SubscriptionTier.FREE ? (
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Crown className="h-8 w-8 text-primary" />
                  )}
                </div>
                <CardTitle className="text-3xl font-bold mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-base mb-6">{plan.description}</CardDescription>
                
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-primary">{plan.currency}</span>
                  <span className="text-5xl font-bold ml-1">{plan.price}</span>
                  {plan.period !== 'forever' && (
                    <span className="text-muted-foreground ml-2 text-lg">/{plan.period}</span>
                  )}
                </div>
                
                {plan.tier === SubscriptionTier.PRO_MONTHLY && (
                  <p className="text-sm text-muted-foreground">
                    Less than ₹3.30 per day • Cancel anytime
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-success mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-6" />
                
                <Button
                  className={`w-full h-12 text-base font-semibold ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90'
                      : ''
                  }`}
                  variant={plan.buttonVariant}
                  onClick={() => !isCurrentPlan(plan.tier) && handleUpgrade(plan.tier)}
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
                      {plan.buttonText}
                    </>
                  ) : (
                    <>
                      {plan.tier === SubscriptionTier.FREE ? (
                        <BookOpen className="mr-2 h-4 w-4" />
                      ) : (
                        <Crown className="mr-2 h-4 w-4" />
                      )}
                      {plan.buttonText}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose PraxisAI Pro?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the difference with our advanced AI tutoring features designed specifically for JEE preparation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Deep Study Mode */}
            <Card className="academic-card text-center p-6">
              <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Deep Study Mode</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Immersive AI tutoring sessions with personalized explanations, step-by-step problem solving, and adaptive learning paths tailored to your JEE preparation needs.
              </p>
            </Card>

            {/* Advanced Analytics */}
            <Card className="academic-card text-center p-6">
              <div className="p-3 bg-secondary/10 rounded-full w-fit mx-auto mb-4">
                <Target className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Monitor your learning journey with detailed analytics, performance insights, and personalized recommendations to optimize your study strategy.
              </p>
            </Card>

            {/* Priority Support */}
            <Card className="academic-card text-center p-6">
              <div className="p-3 bg-success/10 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Priority Support</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Get instant help with priority AI responses, dedicated support channels, and early access to new features and improvements.
              </p>
            </Card>
          </div>
        </div>

        {/* Login Section for Non-Authenticated Users */}
        {!isAuthenticated && (
          <div className="mt-20 max-w-2xl mx-auto">
            <Card className="academic-card border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-8 text-center">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-6">
                  <LogIn className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
                <p className="text-muted-foreground mb-6">
                  Sign in with Google to access your personal AI tutor and start your JEE preparation journey.
                </p>
                <div className="scale-110">
                  <GoogleLogin onLogin={handleLogin} />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Free to start • No credit card required • Cancel anytime
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our pricing and features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="academic-card p-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                Can I cancel anytime?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your Pro subscription at any time. You'll continue to have access to Pro features until the end of your billing period.
              </p>
            </Card>

            <Card className="academic-card p-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <Shield className="h-5 w-5 text-primary mr-2" />
                Is my data secure?
              </h3>
              <p className="text-sm text-muted-foreground">
                Absolutely. We use enterprise-grade security to protect your data and learning progress. Your information is never shared with third parties.
              </p>
            </Card>

            <Card className="academic-card p-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <Zap className="h-5 w-5 text-primary mr-2" />
                What's included in trial sessions?
              </h3>
              <p className="text-sm text-muted-foreground">
                Trial sessions give you full access to Deep Study Mode, advanced problem solving, and personalized tutoring features to experience Pro benefits.
              </p>
            </Card>

            <Card className="academic-card p-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <ArrowRight className="h-5 w-5 text-primary mr-2" />
                How do I upgrade?
              </h3>
              <p className="text-sm text-muted-foreground">
                Simply click the "Upgrade to Pro" button above and follow the secure payment process. You'll get immediate access to all Pro features.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
