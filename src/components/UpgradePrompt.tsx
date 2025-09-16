import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Crown, Zap, CheckCircle, ArrowRight, X } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName: string;
  creditsRemaining: number;
  creditsLimit: number;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  featureName,
  creditsRemaining,
  creditsLimit
}) => {
  const isOutOfCredits = creditsRemaining === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <DialogTitle>
                {isOutOfCredits ? 'All Credits Used!' : 'Credits Running Low!'}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {isOutOfCredits 
              ? `You've used all ${creditsLimit} free Pro credits for today.`
              : `You have ${creditsRemaining} credits remaining out of ${creditsLimit}.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Card className={isOutOfCredits ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className={`h-5 w-5 ${isOutOfCredits ? 'text-red-500' : 'text-yellow-500'}`} />
                <div>
                  <p className="font-medium">
                    {isOutOfCredits ? 'Daily limit reached' : 'Credits running low'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isOutOfCredits 
                      ? `You can't use ${featureName} until tomorrow or upgrade to Pro.`
                      : `Consider upgrading to Pro for unlimited access to ${featureName}.`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pro Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Upgrade to Pro for Unlimited Access</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited Deep Study Mode</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited Study Plan Generator</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited Problem Generator</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited Pro AI Chat</span>
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-3xl font-bold">₹99</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Cancel anytime • Instant access
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={onUpgrade}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Upgrade to Pro
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {isOutOfCredits 
                ? 'Your credits will reset at midnight IST, or upgrade now for unlimited access.'
                : 'You can continue using free features or upgrade for unlimited Pro access.'
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

