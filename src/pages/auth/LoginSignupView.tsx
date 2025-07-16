
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { AuthViewProps } from './types';
import { useAuthForm } from './useAuthForm';
import { useDebugMode } from './useDebugMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const LoginSignupView: React.FC<AuthViewProps> = ({ currentView, onViewChange }) => {
  const { formState, updateFormState, handleLoginSubmit, handleSignupSubmit } = useAuthForm();
  const { debugMode, handleTitleClick } = useDebugMode();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const directLogin = async () => {
    try {
      setIsLoggingIn(true);
      updateFormState({ loginError: null });
      
      logger.debug("Attempting login with:", {
        email: formState.email,
        passwordLength: formState.password?.length || 0
      });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formState.email,
        password: formState.password,
      });
      
      if (error) {
        logger.error("Login error:", error);
        
        let errorMessage = "Authentication failed. Please check your credentials.";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        }
        
        updateFormState({ loginError: errorMessage });
        return;
      }
      
      if (data && data.user) {
        logger.debug("Login successful:", data.user.email);
        toast({
          title: "Login successful",
          description: "You have been successfully logged in.",
        });
      } else {
        updateFormState({ 
          loginError: "Login succeeded but no user data returned."
        });
      }
    } catch (error: unknown) {
      logger.error("Exception during login:", error);
      updateFormState({ 
        loginError: getErrorMessage(error) || "An unexpected error occurred. Please try again."
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
      // Validate role selection for signup
      if (!formState.role) {
        updateFormState({ loginError: "Please select your role to continue." });
        return;
      }
      
      const result = await handleSignupSubmit(e);
      if (result === "login") {
        onViewChange("login");
      }
    }
  };

  const isSignup = currentView === "signup";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-6 space-y-6 bg-card rounded-lg shadow-lg border border-border">
        <h1 
          className="text-2xl font-bold text-center text-foreground cursor-default"
          onClick={handleTitleClick}
        >
          Welcome to Playful Obedience
        </h1>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-foreground text-sm">Email</label>
            <Input
              type="email"
              value={formState.email}
              onChange={(e) => updateFormState({ email: e.target.value })}
              required
              className="bg-background border-border text-foreground"
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-foreground text-sm">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formState.password}
                onChange={(e) => updateFormState({ password: e.target.value })}
                required
                className="bg-background border-border text-foreground pr-10"
                placeholder="********"
                minLength={6}
                autoComplete={currentView === "login" ? "current-password" : "new-password"}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
            {!isSignup && (
              <div className="text-right">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-primary hover:text-primary/80 p-0"
                  onClick={() => onViewChange("forgot-password")}
                >
                  Forgot Password?
                </Button>
              </div>
            )}
          </div>

          {isSignup && (
            <div className="space-y-2">
              <label className="text-foreground text-sm">Select Role</label>
              <Select 
                value={formState.role || ""} 
                onValueChange={(value: 'dominant' | 'submissive') => updateFormState({ role: value })}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Choose your role" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="dominant" className="text-foreground hover:bg-accent">Dominant</SelectItem>
                  <SelectItem value="submissive" className="text-foreground hover:bg-accent">Submissive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {formState.loginError && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{formState.loginError}</span>
            </div>
          )}
          
          {debugMode && (
            <div className="text-xs text-muted-foreground p-2 border border-border rounded bg-muted/50 overflow-auto">
              <p>Debug mode enabled</p>
              <p>Email: {formState.email}</p>
              <p>Password length: {formState.password?.length || 0}</p>
              <p>Auth view: {currentView}</p>
              {isSignup && <p>Selected role: {formState.role || 'none'}</p>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  logger.debug('Debug console clear button clicked. Manual clear needed if desired.');
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Clear Console
              </Button>
            </div>
          )}
          
          <Button 
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={isLoggingIn || formState.loading}
          >
            {isSignup ? <UserPlus className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
            {isLoggingIn || formState.loading ? 
              (isSignup ? 'Creating Account...' : 'Signing In...') : 
              (isSignup ? 'Create Account' : 'Sign In')
            }
          </Button>
          
          <p className="text-center text-sm text-muted-foreground pt-2">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-primary hover:text-primary/80 p-0"
                  onClick={() => onViewChange("login")}
                >
                  Sign in
                </Button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-primary hover:text-primary/80 p-0"
                  onClick={() => onViewChange("signup")}
                >
                  Sign up
                </Button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
