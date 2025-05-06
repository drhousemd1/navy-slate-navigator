
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Tasks from './pages/Tasks';
import Rewards from './pages/Rewards';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster"; // Import our custom Toaster component
import { enableRealtimeSupport } from './integrations/supabase/enableRealtime';

// Enable real-time support when the app loads
enableRealtimeSupport().catch(err => {
  console.warn("Failed to enable real-time support:", err);
});

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Tasks />} />
          <Route path="/rewards" element={<Rewards />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
};

export default App;
