
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';

type AuthView = "login" | "signup" | "forgot-password";

const Auth: React.FC = () => {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { signIn, signUp, isAuthenticated, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      if (authView === "login") {
        console.log("Attempting to sign in with email:", email);
        const { error } = await signIn(email, password);
        if (error) {
          console.error("Login error:", error);
          setLoginError(error.message || "Invalid login credentials. Please check your email and password.");
        } else {
          console.log("Login successful, navigating to home");
          navigate('/');
        }
      } else {
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
          setAuthView("login");
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    
    if (!email) {
      setLoginError("Please enter your email address.");
      setLoading(false);
      return;
    }
    
    try {
      console.log("Attempting to send password reset email to:", email);
      
      const { error } = await resetPassword(email);
      if (error) {
        console.error("Password reset error:", error);
        setLoginError(error.message || "Failed to send password reset email. Please try again.");
      } else {
        toast({
          title: "Password reset link sent",
          description: "Please check your email for instructions on how to reset your password.",
        });
        // Return to login view
        setAuthView("login");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  // Forgot password view
  if (authView === "forgot-password") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
        <div className="w-full max-w-md p-6 space-y-6 bg-dark-navy rounded-lg shadow-lg border border-light-navy">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white p-0 mr-2"
              onClick={() => setAuthView("login")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          </div>
          
          <form onSubmit={handleResetPassword} className="space-y-4">
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
            
            {loginError && (
              <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">
                {loginError}
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
  }

  // Login or Signup view (combined into a single view with different form submissions)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
      <div className="w-full max-w-md p-6 space-y-6 bg-dark-navy rounded-lg shadow-lg border border-light-navy">
        <h1 className="text-2xl font-bold text-center text-white">
          Welcome to the Rewards System
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          
          <div className="space-y-2">
            <label className="text-white text-sm">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-navy border-light-navy text-white"
              placeholder="********"
              minLength={6}
            />
            <div className="text-right">
              <Button 
                type="button" 
                variant="link" 
                className="text-sm text-blue-400 hover:text-blue-300 p-0"
                onClick={() => setAuthView("forgot-password")}
              >
                Forgot Password?
              </Button>
            </div>
          </div>
          
          {loginError && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">
              {loginError}
            </div>
          )}
          
          {/* Sign In Button */}
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
            disabled={loading}
            onClick={() => {
              if (authView !== "login") {
                setAuthView("login");
                return false; // Prevent form submission when just switching views
              }
              return true; // Allow form submission when already on login view
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {loading && authView === "login" ? 'Signing In...' : 'Sign In'}
          </Button>
          
          {/* Create Account Button */}
          <Button 
            type={authView === "signup" ? "submit" : "button"}
            className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center" 
            disabled={loading}
            onClick={(e) => {
              if (authView !== "signup") {
                e.preventDefault();
                setAuthView("signup");
              }
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {loading && authView === "signup" ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="text-center text-xs text-gray-400 pt-2">
          <p>Note: If you have trouble signing in, try using a new email to create a fresh account.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
