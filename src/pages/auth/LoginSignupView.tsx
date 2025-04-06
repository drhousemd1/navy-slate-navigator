
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { AuthViewProps } from './types';
import { useAuthForm } from './useAuthForm';
import { useDebugMode } from './useDebugMode';
import { supabase, clearAuthState, verifyAdminUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const LoginSignupView: React.FC<AuthViewProps> = ({ currentView, onViewChange }) => {
  const { formState, updateFormState, handleLoginSubmit, handleSignupSubmit } = useAuthForm();
  const { debugMode, handleTitleClick } = useDebugMode();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Automatically set admin credentials on load and verify admin account
  useEffect(() => {
    const initAuth = async () => {
      // Clear any existing sessions to prevent conflicts
      await clearAuthState();
      
      // Set admin credentials
      updateFormState({ 
        email: 'towenhall@gmail.com', 
        password: 'LocaMocha2025!'
      });
      
      // Verify admin account exists and is ready
      try {
        const result = await verifyAdminUser();
        console.log('Admin verification result:', result);
      } catch (error) {
        console.error('Error verifying admin account:', error);
      }
    };
    
    initAuth();
  }, []);
  
  // Direct login function to bypass the complex auth flow
  const directLogin = async () => {
    try {
      setIsLoggingIn(true);
      updateFormState({ loginError: null });
      
      // Clear previous sessions and errors
      await clearAuthState();
      
      console.log("Attempting direct login with:", {
        email: formState.email,
        passwordLength: formState.password?.length || 0
      });
      
      // Direct call to Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formState.email,
        password: formState.password,
      });
      
      if (error) {
        console.error("Direct login error:", error);
        
        // Display a more user-friendly error message
        let errorMessage = "Authentication failed. Please check your credentials.";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. The admin account may need to be reset.";
        }
        
        updateFormState({ loginError: errorMessage });
        
        // Attempt to fix admin account if login fails
        try {
          console.log("Attempting to fix admin account...");
          const fixResult = await verifyAdminUser();
          console.log("Admin fix attempt result:", fixResult);
          
          if (fixResult && fixResult.adminVerified) {
            toast({
              title: "Admin account verified",
              description: "Please try logging in again. The account has been reset.",
            });
          }
        } catch (fixError) {
          console.error("Error fixing admin account:", fixError);
        }
        
        return;
      }
      
      if (data && data.user) {
        console.log("Direct login successful:", data.user.email);
        toast({
          title: "Login successful",
          description: "You have been successfully logged in.",
        });
        // Navigation will happen automatically via AuthContext
      } else {
        updateFormState({ 
          loginError: "Login succeeded but no user data returned."
        });
      }
    } catch (error) {
      console.error("Exception during direct login:", error);
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
          
          {/* Debug information when debug mode is enabled */}
          {debugMode && (
            <div className="text-xs text-gray-400 p-2 border border-gray-700 rounded bg-gray-900/50 overflow-auto">
              <p>Debug mode enabled</p>
              <p>Email: {formState.email}</p>
              <p>Password length: {formState.password?.length || 0}</p>
              <p>Auth view: {currentView}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={async () => {
                  console.clear();
                  console.log('Debug console cleared');
                  
                  // Debug - test connection to admin function
                  try {
                    const result = await verifyAdminUser();
                    console.log('Manual admin verification result:', result);
                  } catch (error) {
                    console.error('Error verifying admin in debug mode:', error);
                  }
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Test Admin Account
              </Button>
            </div>
          )}
          
          <Button 
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={isLoggingIn || formState.loading}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {isLoggingIn || formState.loading ? 'Signing In...' : 'Sign In'}
          </Button>
          
          <div className="text-center text-xs text-gray-400 pt-2">
            <p>Admin account credentials are pre-filled for your convenience.</p>
            <p>Email: towenhall@gmail.com</p>
            <p>Password: LocaMocha2025!</p>
          </div>
        </form>
      </div>
    </div>
  );
}
