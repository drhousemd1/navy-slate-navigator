
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Added logger import

export function useForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }
    
    try {
      logger.debug("Attempting to send password reset email to:", email); // Replaced console.log
      
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        logger.error("Password reset error:", resetError); // Replaced console.error
        setError(resetError.message || "Failed to send password reset email. Please try again.");
      } else {
        toast({
          title: "Password reset link sent",
          description: "Please check your email for instructions on how to reset your password.",
        });
        return true;
      }
    } catch (error) {
      logger.error("Password reset error:", error); // Replaced console.error
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
    return false;
  };

  return {
    email,
    setEmail,
    loading,
    error,
    handleResetPassword
  };
}

