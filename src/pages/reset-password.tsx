
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const resetSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

type ResetFormValues = z.infer<typeof resetSchema>;

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const handleReset = async (data: ResetFormValues) => {
    try {
      setIsSubmitting(true);
      const result = await resetPassword(data.email);
      if (!result.error) {
        setEmailSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 mt-2">
            {emailSent 
              ? 'Password reset email sent. Check your inbox.' 
              : 'Enter your email to receive a password reset link.'}
          </p>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
          {!emailSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleReset)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="youremail@example.com"
                          type="email"
                          {...field}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-between mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/login')}
                    type="button"
                  >
                    Back to Login
                  </Button>
                  
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-300 mb-4">
                Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
              </p>
              
              <div className="flex justify-center">
                <Button 
                  onClick={() => navigate('/login')}
                  className="mt-4"
                >
                  Return to Login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
