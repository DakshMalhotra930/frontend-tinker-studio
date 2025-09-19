import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CheckCircle, Clock, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { apiUtils } from '../lib/api';

interface PaymentResponse {
  payment_id: string;
  qr_code: string;
  upi_link: string;
  amount: number;
  currency: string;
  expires_at: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tier?: 'pro_monthly' | 'pro_yearly';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  tier = 'pro_monthly' 
}) => {
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed' | 'expired'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const pricing = {
    pro_monthly: { price: 99, currency: 'INR', period: 'month' },
    pro_yearly: { price: 999, currency: 'INR', period: 'year' },
  };

  const currentPricing = pricing[tier];

  const createPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = apiUtils.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: currentPricing.price,
          currency: currentPricing.currency,
          tier: tier
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      const data = await response.json();
      setPayment(data);
      
      // Calculate time left
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const timeLeftMs = expiresAt.getTime() - now.getTime();
      setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));

    } catch (err) {
      console.error('Error creating payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!payment) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/status/${payment.payment_id}`);
      if (!response.ok) return;

      const data = await response.json();
      setPaymentStatus(data.status);

      if (data.status === 'completed') {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  const copyUPILink = () => {
    if (payment?.upi_link) {
      navigator.clipboard.writeText(payment.upi_link);
    }
  };

  const openUPIApp = () => {
    if (payment?.upi_link) {
      window.open(payment.upi_link, '_blank');
    }
  };

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setPaymentStatus('expired');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Payment status check effect
  useEffect(() => {
    if (!payment || paymentStatus !== 'pending') return;

    const interval = setInterval(checkPaymentStatus, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [payment, paymentStatus]);

  // Create payment when modal opens
  useEffect(() => {
    if (isOpen && !payment && !loading) {
      createPayment();
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Upgrade to Pro</span>
          </DialogTitle>
          <DialogDescription>
            Complete your payment to unlock unlimited Pro features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pricing Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">PraxisAI Pro</h3>
                  <p className="text-sm text-gray-600 capitalize">{tier.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">₹{currentPricing.price}</div>
                  <div className="text-sm text-gray-600">per {currentPricing.period}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Creating payment...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Payment Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button 
                size="sm" 
                onClick={createPayment} 
                className="mt-2"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          )}

          {payment && paymentStatus === 'pending' && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Scan QR Code to Pay</p>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <img 
                    src={`data:image/png;base64,${payment.qr_code}`} 
                    alt="Payment QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Amount: ₹{payment.amount} {payment.currency}
                </p>
              </div>

              {/* UPI Link */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Or pay via UPI</p>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={openUPIApp}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open UPI App
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={copyUPILink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Timer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-yellow-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Payment expires in {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                <div className="animate-pulse bg-blue-100 rounded-full h-2 w-2 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-1">Waiting for payment...</p>
              </div>
            </div>
          )}

          {paymentStatus === 'completed' && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">Payment Successful!</h3>
              <p className="text-sm text-gray-600">
                You now have unlimited access to all Pro features.
              </p>
            </div>
          )}

          {paymentStatus === 'expired' && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Payment Expired</h3>
              <p className="text-sm text-gray-600 mb-4">
                The payment session has expired. Please try again.
              </p>
              <Button onClick={createPayment}>
                Create New Payment
              </Button>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Payment Failed</h3>
              <p className="text-sm text-gray-600 mb-4">
                There was an issue processing your payment. Please try again.
              </p>
              <Button onClick={createPayment}>
                Try Again
              </Button>
            </div>
          )}

          {/* Features List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Pro Features Include:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Unlimited Deep Study Mode</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Unlimited Study Plan Generator</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Unlimited Problem Generator</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Unlimited Pro AI Chat</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            {paymentStatus === 'pending' && (
              <Button 
                onClick={checkPaymentStatus}
                className="flex-1"
              >
                Check Payment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

