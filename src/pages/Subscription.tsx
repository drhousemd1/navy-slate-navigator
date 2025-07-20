import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Crown, CreditCard, Calendar, AlertTriangle } from 'lucide-react';

const Subscription = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground">Manage your app subscription and billing</p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Premium Plan</h3>
                <p className="text-muted-foreground">Full access to all features</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Monthly Cost</p>
                <p className="text-muted-foreground">$9.99/month</p>
              </div>
              <div>
                <p className="font-medium">Next Billing Date</p>
                <p className="text-muted-foreground">January 20, 2025</p>
              </div>
              <div>
                <p className="font-medium">Payment Method</p>
                <p className="text-muted-foreground">•••• 4242</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
            <CardDescription>What's included in your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Unlimited tasks and rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Partner linking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Advanced analytics</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Cloud sync across devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Custom themes</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">December 20, 2024</p>
                  <p className="text-sm text-muted-foreground">Premium Plan - Monthly</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$9.99</p>
                  <Badge variant="outline" className="text-xs">Paid</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">November 20, 2024</p>
                  <p className="text-sm text-muted-foreground">Premium Plan - Monthly</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$9.99</p>
                  <Badge variant="outline" className="text-xs">Paid</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">October 20, 2024</p>
                  <p className="text-sm text-muted-foreground">Premium Plan - Monthly</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$9.99</p>
                  <Badge variant="outline" className="text-xs">Paid</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                  VISA
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/28</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Subscription Actions
            </CardTitle>
            <CardDescription>
              Manage your subscription preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="w-full">
                Change Plan
              </Button>
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </div>
            <Separator />
            <div className="pt-4">
              <Button variant="destructive" className="w-full">
                Cancel Subscription
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Your subscription will remain active until January 20, 2025
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscription;