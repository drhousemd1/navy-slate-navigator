
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoaderCircle } from 'lucide-react';

const AuthenticatedAppLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading: authLoading, sessionExists, userExists, isAuthenticated } = useAuth();

  useEffect(() => {
    if (authLoading) {
      console.log('AuthenticatedAppLoader: Auth is loading...');
    } else {
      console.log('AuthenticatedAppLoader: Auth loading complete.', { sessionExists, userExists, isAuthenticated });
    }
  }, [authLoading, sessionExists, userExists, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-background">
        <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Initializing session...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthenticatedAppLoader;
