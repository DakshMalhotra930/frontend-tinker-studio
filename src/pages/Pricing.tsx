import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Check, Crown, Zap, Star, ArrowRight } from 'lucide-react';
import { PaymentModal } from '../components/PaymentModal';
import { CreditDisplay } from '../components/CreditDisplay';
import { apiUtils } from '../lib/api';

interface PricingInfo {
  monthly: {
    price: number;
    currency: string;
    features: string[];
  };
  yearly: {
    price: number;
    currency: string;
    features: string[];
    discount: string;
  };
  lifetime: {
    price: number;
    currency: string;
    features: string[];
  };
  features: string[];
  free_features: string[];
}

export const Pricing: React.FC = () => {
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<'pro_monthly' | 'pro_yearly' | 'pro_lifetime'>('pro_monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadPricingInfo();
    setIsAuthenticated(apiUtils.isAuthenticated());
  }, []);

  const loadPricingInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/pricing`);
      if (!response.ok) {
        throw new Error('Failed to load pricing info');
      }
      const data = await response.json();
      setPricingInfo(data);
    } catch (error) {
      console.error('Error loading pricing info:', error);
      // Fallback pricing data
      setPricingInfo({
        monthly: {
          price: 99,
          currency: 'INR',
          features: [
            'Unlimited Deep Study Mode',
            'Unlimited Study Plan Generator',
            'Unlimited Problem Generator',
            'Unlimited Pro AI Chat',
            'Priority Support'
          ]
        },
        yearly: {
          price: 999,
          currency: 'INR',
          features: [
            'Everything in Monthly',
            '2 months free',
            'Priority Support',
            'Advanced Analytics'
          ],
          discount: '17% off'
        },
        lifetime: {
          price: 2999,
          currency: 'INR',
          features: [
            'Everything in Yearly',
            'Lifetime access',
            'Premium Support',
            'Early access to new features'
          ]
        },
        features: [
          'Deep Study Mode - Advanced AI tutoring with context memory',
          'Study Plan Generator - AI-powered personalized study plans',
          'Problem Generator - AI-generated JEE practice problems',
          'Pro AI Chat - Advanced AI chat with specialized JEE knowledge'
        ],
        free_features: [
          'Syllabus Browser - Browse JEE syllabus and topics',
          'Quick Help - Quick AI help for simple questions',
          'Standard Chat - Basic AI chat functionality',
          'Resource Browser - Browse educational resources',
          '5 Daily Pro Credits - Try Pro features for free'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (tier: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime') => {
    if (!isAuthenticated) {
      // Redirect to login or show login modal
      alert('Please log in to upgrade to Pro');
      return;
    }
    setSelectedTier(tier);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    // Refresh the page or update user state
    window.location.reload();
  };

  if (loading) {
  return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-6">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 mb-6"></div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded"></div>
                      ))}
            </div>
          </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pricingInfo) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Pricing</h1>
            <p className="text-gray-600">Failed to load pricing information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get unlimited access to all Pro features with our flexible pricing
          </p>
          
          {/* Credit Display for authenticated users */}
          {isAuthenticated && (
            <div className="max-w-md mx-auto mb-8">
              <CreditDisplay onUpgrade={() => handleUpgrade('pro_monthly')} />
              </div>
            )}
        </div>

          {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <span>Monthly</span>
              </CardTitle>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">₹{pricingInfo.monthly.price}</span>
                <span className="text-gray-500">/month</span>
                  </div>
                </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {pricingInfo.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
                  <Button
                onClick={() => handleUpgrade('pro_monthly')}
                className="w-full"
                    variant="outline"
                  >
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

          {/* Yearly Plan - Most Popular */}
          <Card className="relative border-2 border-blue-500">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500 text-white px-4 py-1">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
                  </Badge>
                </div>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Yearly</span>
                <Badge variant="secondary" className="ml-2">
                  {pricingInfo.yearly.discount}
                </Badge>
              </CardTitle>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">₹{pricingInfo.yearly.price}</span>
                <span className="text-gray-500">/year</span>
                  </div>
              <p className="text-sm text-gray-600">
                Save ₹189 compared to monthly billing
              </p>
                </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {pricingInfo.yearly.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
                    <Button
                onClick={() => handleUpgrade('pro_yearly')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
            </CardContent>
          </Card>

          {/* Lifetime Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-purple-500" />
                <span>Lifetime</span>
              </CardTitle>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">₹{pricingInfo.lifetime.price}</span>
                <span className="text-gray-500">one-time</span>
              </div>
              <p className="text-sm text-gray-600">
                Best value for long-term users
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {pricingInfo.lifetime.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
                      <Button
                onClick={() => handleUpgrade('pro_lifetime')}
                className="w-full"
                        variant="outline"
                      >
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
            </CardContent>
          </Card>
                    </div>

        {/* Features Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pro Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Pro Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pricingInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Free Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <span>Always Free</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pricingInfo.free_features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
                </CardContent>
              </Card>
            </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">What are daily credits?</h3>
              <p className="text-gray-600 text-sm">
                All users get 5 free Pro credits every day. Each credit allows you to use one Pro feature 
                (Deep Study Mode, Study Plan Generator, or Problem Generator). Credits reset at midnight IST.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">What happens when I upgrade to Pro?</h3>
              <p className="text-gray-600 text-sm">
                With Pro, you get unlimited access to all Pro features without any daily limits. 
                You can use Deep Study Mode, Study Plan Generator, and Problem Generator as much as you want.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription anytime. You'll continue to have Pro access until 
                the end of your current billing period, then return to the free plan with daily credits.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">
                We accept UPI payments through QR codes. You can pay using any UPI app like Google Pay, 
                PhonePe, Paytm, or BHIM. We're working on adding more payment methods soon.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          tier={selectedTier}
        />
    </div>
  );
};