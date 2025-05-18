
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { OfflineBanner } from '@/components/OfflineBanner';

// Page Imports (assuming these exist based on your project)
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Rewards from './pages/Rewards';
import Rules from './pages/Rules';
import Punishments from './pages/Punishments';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login'; // Assuming a login page
import Signup from './pages/Signup'; // Assuming a signup page
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute"; // Assuming this component handles auth checks

// Placeholder for other pages if they exist
// import ThroneRoom from './pages/ThroneRoom';
// import AdminTesting from './pages/AdminTesting'; // This will be removed based on the plan

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NetworkStatusProvider>
        <Router>
          <OfflineBanner />
          <Toaster />
          <Routes>
            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
            <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
            <Route path="/punishments" element={<ProtectedRoute><Punishments /></ProtectedRoute>} />
            {/* <Route path="/throne-room" element={<ProtectedRoute><ThroneRoom /></ProtectedRoute>} /> */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* Redirect unknown paths to dashboard or login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NetworkStatusProvider>
    </ThemeProvider>
  );
}

export default App;
