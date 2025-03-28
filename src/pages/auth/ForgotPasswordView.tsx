
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { useForgotPassword } from './useForgotPassword';

interface ForgotPasswordViewProps {
  onBackClick: () => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBackClick }) => {
  const { email, setEmail, loading, error, handleResetPassword } = useForgotPassword();

  const onSubmit = async (e: React.FormEvent) => {
    const success = await handleResetPassword(e);
    if (success) {
      onBackClick();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
      <div className="w-full max-w-md p-6 space-y-6 bg-dark-navy rounded-lg shadow-lg border border-light-navy">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white p-0 mr-2"
            onClick={onBackClick}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-white text-sm">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-navy border-light-navy text-white"
              placeholder="your@email.com"
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">
              {error}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={loading}
          >
            {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </Button>
        </form>
        
        <div className="text-center text-xs text-gray-400 pt-2">
          <p>We'll send a password reset link to the email address associated with your account.</p>
        </div>
      </div>
    </div>
  );
};
