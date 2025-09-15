import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Crown, Check, Zap, Star, BookOpen, Brain, Target, Users, Shield, Clock, ArrowRight, LogIn, CheckCircle, GraduationCap, ChevronDown, User, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useUserType } from '../hooks/useUserType';
import { toast } from '../hooks/use-toast';
import GoogleLogin from '../components/GoogleLogin';

const Pricing: React.FC = () => {
  // Pricing page component
  const { isAuthenticated, user, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { usageStatus } = useUsageTracking();
  const { isPremium } = useUserType();

  const handleLogin = (userData: any) => {
    login(userData);
  };

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to upgrade to Pro.',
        variant: 'destructive',
      });
      return;
    }
    
    // TODO: Implement actual upgrade logic
    toast({
      title: 'Upgrade to Pro',
      description: 'Pro upgrade functionality will be implemented soon!',
    });
  };

  const freeFeatures = [
    '5 Daily AI Credits',
    'Access to All Subjects',
    'Standard Study Content',
    'Community Support'
  ];

  const proFeatures = [
    'Unlimited AI Credits',
    'AI Deep Study Sessions',
    'Personalized Study Plans',
    'Advanced Problem Solving',
    'Priority Support'
  ];

  return (
    <div className="min-h-screen bg-zinc-900 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-zinc-800 border-r border-zinc-700 flex flex-col">
        {/* Logo and Branding */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Praxis AI</h1>
              <p className="text-sm text-zinc-400">JEE Prep Tutor</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Navigation</h3>
          <nav className="space-y-2">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center space-x-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-white bg-purple-600 rounded-lg">
              <Crown className="w-5 h-5" />
              <span>Pricing</span>
            </button>
          </nav>
        </div>

        {/* Usage Status */}
        <div className="p-6 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Usage Status</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300">Daily Credits</span>
                <span className="text-white">{usageStatus?.usageCount || 0}/{usageStatus?.usageLimit || 5}</span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((usageStatus?.usageCount || 0) / (usageStatus?.usageLimit || 5)) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-zinc-400">Resets in 24 hours.</p>
          </div>
        </div>

        {/* User Profile */}
        <div className="mt-auto p-6 border-t border-zinc-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Choose Your Plan</h1>
              <p className="text-zinc-400 mt-1">Unlock your full potential with Praxis AI. Select a plan that fits your study needs and start acing your exams.</p>
            </div>
            {!isAuthenticated && (
              <div className="scale-110">
                <GoogleLogin onLogin={handleLogin} />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Pricing Cards */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader className="text-center pb-6 pt-8">
                  <CardTitle className="text-3xl font-bold text-white mb-2">Free</CardTitle>
                  <CardDescription className="text-zinc-400 mb-6">
                    For casual learners to get a taste of AI-powered studying.
                  </CardDescription>
                  
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-bold text-white">₹0</span>
                    <span className="text-zinc-400 ml-2 text-lg">/ month</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {freeFeatures.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-zinc-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border-zinc-600 text-zinc-400 bg-zinc-700 hover:bg-zinc-600"
                    disabled
                  >
                    Your Current Plan
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500 relative">
                <div className="absolute -top-3 right-6">
                  <Badge className="bg-purple-500 text-white px-3 py-1 text-xs">
                    BEST VALUE
                  </Badge>
                </div>
                
                <CardHeader className="text-center pb-6 pt-8">
                  <CardTitle className="text-3xl font-bold text-white mb-2">Pro</CardTitle>
                  <CardDescription className="text-zinc-200 mb-6">
                    For serious students who want unlimited access to our most powerful AI tools.
                  </CardDescription>
                  
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-bold text-white">₹99</span>
                    <span className="text-zinc-200 ml-2 text-lg">/ month</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {proFeatures.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-white mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    className="w-full h-12 text-base font-semibold bg-white text-purple-600 hover:bg-zinc-100"
                    onClick={handleUpgrade}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Footer Text */}
            <div className="text-center mt-8">
              <p className="text-sm text-zinc-400">
                Prices are listed in INR. You can cancel your subscription at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;