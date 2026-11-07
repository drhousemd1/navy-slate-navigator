
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors'; // Added import

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
      return false; // Ensure boolean return for consistency
    }
    
    try {
      logger.debug("Attempting to send password reset email to:", email);
      
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        logger.error("Password reset error:", resetError);
        setError(getErrorMessage(resetError)); // Used getErrorMessage
      } else {
        setLoading(false); // Ensure loading is set to false on success
        return true;
      }
    } catch (error: unknown) { // Changed to error: unknown
      logger.error("Password reset error (general catch):", error); // Added context to log
      setError(getErrorMessage(error)); // Used getErrorMessage
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
