import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, AlertCircle, RefreshCw } from 'lucide-react';
import { AuthViewProps } from './types';
import { useAuthForm } from './useAuthForm';
import { useDebugMode } from './useDebugMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export const LoginSignupView: React.FC<AuthViewProps> = ({ currentView, onViewChange }) => {
  const { formState, updateFormState, handleLoginSubmit, handleSignupSubmit } = useAuthForm();
  const { debugMode, handleTitleClick } = useDebugMode();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Direct login function
  const directLogin = async () => {
    try {
      setIsLoggingIn(true);
      updateFormState({ loginError: null });
      
      logger.log("Attempting login with:", {
        email: formState.email,
        // Redact password for logging
        passwordProvided: (formState.password?.length || 0) > 0 
      });
      
      // Direct call to Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formState.email,
        password: formState.password,
      });
      
      if (error) {
        logger.error("Login error:", { message: error.message, code: error.code });
        
        // Display a user-friendly error message
        let errorMessage = "Authentication failed. Please check your credentials.";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        }
        
        updateFormState({ loginError: errorMessage });
        return;
      }
      
      if (data && data.user) {
        logger.log("Login successful, user email:", data.user.email ? '[EMAIL_REDACTED]' : 'N/A');
        toast({
          title: "Login successful",
          description: "You have been successfully logged in.",
        });
        // Navigation will happen automatically via AuthContext
      } else {
        updateFormState({ 
          loginError: "Login succeeded but no user data returned."
        });
        logger.warn("Login succeeded but no user data returned.", { email: formState.email ? '[EMAIL_REDACTED]' : 'N/A' });
      }
    } catch (error: any) {
      logger.error("Exception during login:", { message: error?.message, error });
      updateFormState({ 
        loginError: error.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentView === "login") {
      directLogin();
    } else {
      // Sanitize email before logging
      const emailToLog = formState.email ? '[EMAIL_REDACTED]' : 'N/A';
      logger.log("Attempting signup with email:", emailToLog);
      const result = await handleSignupSubmit(e);
      if (result === "login") {
        onViewChange("login");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
      <div className="w-full max-w-md p-6 space-y-6 bg-dark-navy rounded-lg shadow-lg border border-light-navy">
        <h1 
          className="text-2xl font-bold text-center text-white cursor-default"
          onClick={handleTitleClick}
        >
          Welcome to the Rewards System
        </h1>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-white text-sm">Email</label>
            <Input
              type="email"
              value={formState.email}
              onChange={(e) => updateFormState({ email: e.target.value })}
              required
              className="bg-navy border-light-navy text-white"
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-white text-sm">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formState.password}
                onChange={(e) => updateFormState({ password: e.target.value })}
                required
                className="bg-navy border-light-navy text-white pr-10"
                placeholder="********"
                minLength={6}
                autoComplete={currentView === "login" ? "current-password" : "new-password"}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
            <div className="text-right">
              <Button 
                type="button" 
                variant="link" 
                className="text-sm text-blue-400 hover:text-blue-300 p-0"
                onClick={() => onViewChange("forgot-password")}
              >
                Forgot Password?
              </Button>
            </div>
          </div>
          
          {formState.loginError && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{formState.loginError}</span>
            </div>
          )}
          
          {debugMode && (
            <div className="text-xs text-gray-400 p-2 border border-gray-700 rounded bg-gray-900/50 overflow-auto">
              <p>Debug mode enabled</p>
              <p>Email: {formState.email ? '[EMAIL_REDACTED]' : 'N/A'}</p>
              <p>Password length: {formState.password?.length || 0}</p>
              <p>Auth view: {currentView}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  logger.log('Debug console cleared');
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Clear Log Output Indication
              </Button>
            </div>
          )}
          
          <Button 
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={isLoggingIn || formState.loading}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {isLoggingIn || formState.loading 
              ? (currentView === "login" ? 'Signing In...' : 'Creating Account...') 
              : (currentView === "login" ? 'Sign In' : 'Sign Up')}
          </Button>
          
          {currentView === "login" && (
            <p className="text-center text-sm text-gray-400 pt-2">
              Don't have an account?{" "}
              <Button 
                type="button" 
                variant="link" 
                className="text-blue-400 hover:text-blue-300 p-0"
                onClick={() => onViewChange("signup")}
              >
                Sign up
              </Button>
            </p>
          )}
          {currentView === "signup" && (
             <p className="text-center text-sm text-gray-400 pt-2">
              Already have an account?{" "}
              <Button 
                type="button" 
                variant="link" 
                className="text-blue-400 hover:text-blue-300 p-0"
                onClick={() => onViewChange("login")}
              >
                Sign In
              </Button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
