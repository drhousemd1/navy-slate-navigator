
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { AuthViewProps } from './types';
import { useAuth } from '@/contexts/auth/AuthContext';
import { toast } from '@/hooks/use-toast';

export const LoginSignupView: React.FC<AuthViewProps> = ({ currentView, onViewChange }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  const { signIn, signUp } = useAuth();
  
  const handleTitleClick = () => {
    // Toggle debug mode after 5 clicks for troubleshooting
    const clickCount = parseInt(localStorage.getItem('titleClickCount') || '0') + 1;
    localStorage.setItem('titleClickCount', clickCount.toString());
    
    if (clickCount >= 5) {
      setDebugMode(!debugMode);
      localStorage.setItem('titleClickCount', '0');
      toast({
        title: debugMode ? 'Debug mode disabled' : 'Debug mode enabled',
        description: 'Developer tools are now available',
      });
    }
  };
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      // Validate input first
      if (!email || !password) {
        setLoginError("Email and password are required");
        setLoading(false);
        return;
      }
      
      console.log("Login attempt with email:", email);
      
      // Sign in with email and password
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error("Login error:", error);
        setLoginError(error.message || "Authentication failed. Please check your credentials.");
      } else {
        // Success case
        toast({
          title: "Login successful",
          description: "You have been successfully logged in.",
        });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      // Validate input
      if (!email || !password) {
        setLoginError("Email and password are required");
        setLoading(false);
        return;
      }
      
      if (password.length < 6) {
        setLoginError("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }
      
      console.log("Attempting to sign up with email:", email);
      const { error } = await signUp(email, password);
      
      if (error) {
        console.error("Signup error:", error);
        setLoginError(error.message || "Error creating account. This email may already be in use.");
      } else {
        toast({
          title: "Account created",
          description: "Please check your email for verification instructions.",
        });
        onViewChange("login");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    if (currentView === "login") {
      await handleLoginSubmit(e);
    } else {
      await handleSignupSubmit(e);
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          
          {loginError && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
          
          {/* Debug information when debug mode is enabled */}
          {debugMode && (
            <div className="text-xs text-gray-400 p-2 border border-gray-700 rounded bg-gray-900/50 overflow-auto">
              <p>Debug mode enabled</p>
              <p>Email: {email}</p>
              <p>Password length: {password?.length || 0}</p>
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
          
          {/* Sign In Button */}
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={loading}
            onClick={(e) => {
              if (currentView !== "login") {
                e.preventDefault();
                onViewChange("login");
              }
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {loading && currentView === "login" ? 'Signing In...' : 'Sign In'}
          </Button>
          
          {/* Create Account Button */}
          <Button 
            type={currentView === "signup" ? "submit" : "button"}
            className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center" 
            disabled={loading}
            onClick={(e) => {
              if (currentView !== "signup") {
                e.preventDefault();
                onViewChange("signup");
              }
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {loading && currentView === "signup" ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="text-center text-xs text-gray-400 pt-2">
          <p>
            Try these credentials: <br />
            Email: test@example.com <br />
            Password: password123
          </p>
          <p className="mt-2">
            Note: If you need to create a new account, verification might be enabled in Supabase.
          </p>
        </div>
      </div>
    </div>
  );
};
