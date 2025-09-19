import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Smartphone,
  CreditCard,
  Loader2
} from 'lucide-react';
import { paymentAPI } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tier: 'pro_monthly' | 'pro_yearly';
  userId: string;
}

const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tier,
  userId
}) => {
  const [step, setStep] = useState<'create' | 'payment' | 'verifying' | 'success' | 'error'>('create');
  const [qrData, setQrData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed' | 'expired'>('pending');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const tierInfo = {
    pro_monthly: { name: 'Pro Monthly', price: 99, period: 'month' },
    pro_yearly: { name: 'Pro Yearly', price: 990, period: 'year' },
  };

  const currentTier = tierInfo[tier];

  useEffect(() => {
    if (isOpen && step === 'create') {
      createPayment();
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (qrData && step === 'payment') {
      const interval = setInterval(() => {
        checkPaymentStatus();
        setTimeLeft(prev => {
          if (prev <= 1) {
            setStep('error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [qrData, step]);

  const createPayment = async () => {
    try {
      const response = await paymentAPI.createQRPayment({
        amount: currentTier.price,
        currency: 'INR',
        user_id: userId,
        tier: tier
      });

      setQrData(response);
      setTimeLeft(15 * 60); // 15 minutes
      setStep('payment');
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to create payment. Please try again.',
        variant: 'destructive'
      });
      setStep('error');
    }
  };

  const checkPaymentStatus = async () => {
    if (!qrData?.qr_code) return;

    try {
      setIsVerifying(true);
      const status = await paymentAPI.getQRPaymentStatus(qrData.qr_code);
      setPaymentStatus(status.status);

      if (status.status === 'completed') {
        setStep('success');
        onSuccess();
      } else if (status.status === 'failed' || status.status === 'expired') {
        setStep('error');
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPayment = async () => {
    if (!qrData?.qr_code) return;

    try {
      setIsVerifying(true);
      setStep('verifying');
      
      const result = await paymentAPI.verifyQRPayment({
        qr_code: qrData.qr_code,
        user_id: userId
      });

      if (result.success) {
        setPaymentStatus('completed');
        setStep('success');
        onSuccess();
      } else {
        setPaymentStatus('failed');
        setStep('error');
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      setPaymentStatus('failed');
      setStep('error');
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'completed':
        return 'Payment Successful!';
      case 'failed':
        return 'Payment Failed';
      case 'expired':
        return 'Payment Expired';
      default:
        return 'Waiting for Payment...';
    }
  };

  const handleClose = () => {
    setStep('create');
    setQrData(null);
    setPaymentStatus('pending');
    setCopied(false);
    setTimeLeft(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {currentTier.name} Payment
          </DialogTitle>
          <DialogDescription>
            Complete your payment using UPI QR code or direct UPI link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Plan</span>
                <span className="font-medium">{currentTier.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Amount</span>
                <span className="font-bold text-lg">₹{currentTier.price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Billing</span>
                <span className="text-sm">Per {currentTier.period}</span>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Section */}
          {step === 'payment' && qrData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>
                  Scan with any UPI app to complete payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img 
                      src={`data:image/png;base64,${qrData.qr_image}`}
                      alt="UPI QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon()}
                    <span className="font-medium">{getStatusText()}</span>
                  </div>
                  
                  {paymentStatus === 'pending' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                      <Clock className="h-4 w-4" />
                      <span>Expires in {formatTime(timeLeft)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Instructions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Payment Instructions</Label>
                  <div className="text-sm text-zinc-600 space-y-2">
                    <p>1. Open any UPI app (Google Pay, PhonePe, Paytm, BHIM)</p>
                    <p>2. Scan the QR code above</p>
                    <p>3. Complete the payment of ₹{currentTier.price}</p>
                    <p>4. Click "Verify Payment" below</p>
                  </div>
                </div>

                {/* Manual Verification Button */}
                <div className="pt-2">
                  <Button
                    onClick={verifyPayment}
                    disabled={isVerifying}
                    className="w-full"
                    variant="default"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Payment'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success State */}
          {step === 'success' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
                    <p className="text-sm text-green-600">
                      Your {currentTier.name} subscription is now active.
                    </p>
                  </div>
                  <Button onClick={handleClose} className="w-full">
                    Continue to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {step === 'error' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Payment Failed</h3>
                    <p className="text-sm text-red-600">
                      {paymentStatus === 'expired' 
                        ? 'Payment session expired. Please try again.'
                        : 'Payment could not be completed. Please try again.'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                      Close
                    </Button>
                    <Button onClick={createPayment} className="flex-1">
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {step === 'verifying' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                  <div>
                    <h3 className="text-lg font-semibold">Verifying Payment...</h3>
                    <p className="text-sm text-zinc-400">
                      Please wait while we verify your payment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {step === 'payment' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-800 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    How to Pay
                  </h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p>1. Open any UPI app (PhonePe, Google Pay, Paytm, etc.)</p>
                    <p>2. Scan the QR code or use the UPI link</p>
                    <p>3. Complete the payment</p>
                    <p>4. Payment will be verified automatically</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRPaymentModal;
