import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Crown, Zap, AlertCircle } from 'lucide-react';
import { apiUtils } from '../lib/api';

interface CreditStatus {
  user_id: string;
  credits_used: number;
  credits_remaining: number;
  credits_limit: number;
  credits_date: string;
  is_pro_user: boolean;
}

interface CreditDisplayProps {
  onUpgrade?: () => void;
  compact?: boolean;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({ onUpgrade, compact = false }) => {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCreditStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = apiUtils.getUserId();
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/credits/status/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load credit status');
      }

      const data = await response.json();
      setCreditStatus(data);
    } catch (err) {
      console.error('Error loading credit status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditStatus();
  }, []);

  if (loading) {
    return (
      <Card className={compact ? "p-3" : "p-4"}>
        <CardContent className={compact ? "p-0" : "p-0"}>
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !creditStatus) {
    return (
      <Card className={compact ? "p-3" : "p-4"}>
        <CardContent className={compact ? "p-0" : "p-0"}>
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load credits</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { credits_used, credits_remaining, credits_limit, is_pro_user } = creditStatus;
  const creditPercentage = (credits_used / credits_limit) * 100;

  if (is_pro_user) {
    return (
      <Card className={compact ? "p-3" : "p-4"}>
        <CardContent className={compact ? "p-0" : "p-0"}>
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600">Pro User</span>
            <Badge variant="secondary" className="text-xs">
              Unlimited
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-3">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {credits_remaining} / {credits_limit} credits
              </span>
            </div>
            {credits_remaining === 0 && onUpgrade && (
              <Button size="sm" onClick={onUpgrade} className="h-6 text-xs">
                Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Daily Pro Credits</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {credits_remaining} remaining
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Used: {credits_used} / {credits_limit}</span>
              <span>{credits_remaining} left</span>
            </div>
            <Progress 
              value={creditPercentage} 
              className="h-2"
              style={{
                background: credits_remaining === 0 
                  ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                  : creditPercentage > 80
                  ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
              }}
            />
          </div>

          {credits_remaining === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">All credits used!</span>
              </div>
              <p className="text-xs text-red-600 mt-1">
                You've used all 5 free Pro credits for today. Upgrade to Pro for unlimited access!
              </p>
              {onUpgrade && (
                <Button 
                  size="sm" 
                  onClick={onUpgrade} 
                  className="mt-2 w-full bg-red-600 hover:bg-red-700"
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          )}

          {credits_remaining > 0 && credits_remaining <= 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Credits running low!</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Only {credits_remaining} credits left. Consider upgrading to Pro for unlimited access.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

