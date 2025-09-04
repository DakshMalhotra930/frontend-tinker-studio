import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Crown, Settings, CreditCard, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { toast } from '../hooks/use-toast';
import { format } from 'date-fns';

const Subscription: React.FC = () => {
  const { subscription, loading, cancelSubscription, refreshSubscription } = useSubscription();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.')) {
      return;
    }

    try {
      setCancelling(true);
      const success = await cancelSubscription();
      
      if (success) {
        toast({
          title: 'Subscription cancelled',
          description: 'Your subscription will remain active until the end of your billing period.',
        });
        await refreshSubscription();
      } else {
        toast({
          title: 'Failed to cancel subscription',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to cancel subscription',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subscription information...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pro':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'trial':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'expired':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pro':
        return <Crown className="h-4 w-4" />;
      case 'trial':
        return <Calendar className="h-4 w-4" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Subscription Management
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage your subscription and billing preferences
          </p>
        </div>

        {/* Current Subscription Status */}
        <Card className="academic-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge 
                  variant="academic" 
                  className={`${getStatusColor(subscription.status)} text-white`}
                >
                  {getStatusIcon(subscription.status)}
                  <span className="ml-1 capitalize">{subscription.status}</span>
                </Badge>
                <span className="font-semibold">
                  {subscription.tier.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              {subscription.status === 'pro' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              )}
            </div>

            {subscription.expires_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {subscription.status === 'pro' ? 'Renews' : 'Expires'} on{' '}
                  {format(new Date(subscription.expires_at), 'MMMM d, yyyy')}
                </span>
              </div>
            )}

            {(subscription.status === 'free' || subscription.status === 'trial') && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Trial Sessions</span>
                </div>
                <p className="text-amber-700 text-sm mt-1">
                  {subscription.trial_sessions_used} of {subscription.trial_sessions_limit} trial sessions used
                </p>
                <div className="mt-2">
                  <div className="w-full bg-amber-200 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(subscription.trial_sessions_used / subscription.trial_sessions_limit) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Features */}
        <Card className="academic-card mb-8">
          <CardHeader>
            <CardTitle>Available Features</CardTitle>
            <CardDescription>
              Features you currently have access to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {subscription.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        {subscription.status === 'pro' && (
          <Card className="academic-card mb-8">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Manage your payment method and billing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground">
                    Update your payment information
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Update Payment
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Billing History</p>
                  <p className="text-sm text-muted-foreground">
                    View your past invoices and payments
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade Section for Free Users */}
        {subscription.status === 'free' && (
          <Card className="academic-card border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="h-5 w-5 mr-2 text-primary" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>
                Unlock all features and get unlimited access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Get access to Deep Study Mode, Advanced Quiz Generation, and unlimited sessions.
                </p>
                <Button 
                  variant="academic" 
                  className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  View Pricing Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Subscription;
