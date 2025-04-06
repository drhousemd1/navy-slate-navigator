
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { AuthViewProps } from './types';
import { useAuthForm } from './useAuthForm';
import { useDebugMode } from './useDebugMode';

export const LoginSignupView: React.FC<AuthViewProps> = ({ currentView, onViewChange }) => {
  const { formState, updateFormState, handleLoginSubmit, handleSignupSubmit } = useAuthForm();
  const { debugMode, handleTitleClick } = useDebugMode();
  const [showPassword, setShowPassword] = useState(false);
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentView === "login") {
      await handleLoginSubmit(e);
    } else {
      const result = await handleSignupSubmit(e);
      if (result === "login") {
        onViewChange("login");
      }
    }
  };

  // Helper function to fill admin credentials
  const fillAdminCredentials = () => {
    updateFormState({ 
      email: 'towenhall@gmail.com', 
      password: 'LocaMocha2025!'
    });
  };

  // Helper function to fill demo credentials
  const fillDemoCredentials = () => {
    updateFormState({ 
      email: 'demo@example.com', 
      password: 'demo123456'
    });
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
              <p>API URL: {import.meta.env.VITE_SUPABASE_URL || "Not set"}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  console.clear();
                  console.log('Debug console cleared');
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Clear Console
              </Button>
            </div>
          )}
          
          {/* Login Button */}
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={formState.loading}
            onClick={(e) => {
              if (currentView !== "login") {
                e.preventDefault();
                onViewChange("login");
              }
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {formState.loading && currentView === "login" ? 'Signing In...' : 'Sign In'}
          </Button>
          
          {/* Create Account Button */}
          <Button 
            type={currentView === "signup" ? "submit" : "button"}
            className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center" 
            disabled={formState.loading}
            onClick={(e) => {
              if (currentView !== "signup") {
                e.preventDefault();
                onViewChange("signup");
              }
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {formState.loading && currentView === "signup" ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="text-center text-xs text-gray-400 pt-2">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="text-sm bg-amber-800/20 hover:bg-amber-800/30 border-amber-800/40"
              onClick={fillAdminCredentials}
            >
              Use admin account
              <span className="ml-2 text-xs opacity-70">(towenhall@gmail.com)</span>
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              size="sm" 
              className="text-xs text-gray-400 hover:text-gray-300"
              onClick={fillDemoCredentials}
            >
              Use demo account instead
            </Button>
          </div>
          
          <p className="mt-2">
            Note: Click the buttons above to automatically fill in login credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
