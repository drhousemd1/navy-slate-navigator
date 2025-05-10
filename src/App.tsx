
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './components/theme-provider';
import { ToastProvider } from './hooks/use-toast.tsx'; // Updated import to specify the .tsx extension
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Rewards from './pages/Rewards';
import Rules from './pages/Rules';
import Punishments from './pages/Punishments';
import AdminTesting from './pages/AdminTesting';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CacheCleanup from './CacheCleanup';

function App() {
  const queryClient = new QueryClient();

  const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <CacheCleanup />
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
                <Route path="/rewards" element={<PrivateRoute><Rewards /></PrivateRoute>} />
                <Route path="/rules" element={<PrivateRoute><Rules /></PrivateRoute>} />
                <Route path="/punishments" element={<PrivateRoute><Punishments /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute><AdminTesting /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
