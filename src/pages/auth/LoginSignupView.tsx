
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus } from 'lucide-react';
import { AuthViewProps } from './types';
import { useAuthForm } from './useAuthForm';
import { useDebugMode } from './useDebugMode';

export const LoginSignupView: React.FC<AuthViewProps> = ({ currentView, onViewChange }) => {
  const { formState, updateFormState, handleLoginSubmit, handleSignupSubmit } = useAuthForm();
  const { debugMode, handleTitleClick } = useDebugMode();
  
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
            <Input
              type="password"
              value={formState.password}
              onChange={(e) => updateFormState({ password: e.target.value })}
              required
              className="bg-navy border-light-navy text-white"
              placeholder="********"
              minLength={6}
              autoComplete={currentView === "login" ? "current-password" : "new-password"}
            />
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
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">
              {formState.loginError}
            </div>
          )}
          
          {/* Debug information when debug mode is enabled */}
          {debugMode && (
            <div className="text-xs text-gray-400 p-2 border border-gray-700 rounded bg-gray-900/50 overflow-auto">
              <p>Debug mode enabled</p>
              <p>Email: {formState.email}</p>
              <p>Auth view: {currentView}</p>
              <p>API URL: {import.meta.env.VITE_SUPABASE_URL || "Not set"}</p>
            </div>
          )}
          
          {/* Sign In Button */}
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={formState.loading}
            onClick={(e) => {
              if (currentView !== "login") {
                e.preventDefault();
                onViewChange("login");
                return;
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
          <p>Note: If you have trouble signing in, try using a new email to create a fresh account.</p>
        </div>
      </div>
    </div>
  );
};
