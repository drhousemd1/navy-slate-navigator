import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Tasks from './pages/Tasks';
import Rewards from './pages/Rewards';
import { AuthProvider } from './contexts/AuthContext';
import PublicRoute from './components/routes/PublicRoute';
import Login from './pages/Login';
import PrivateRoute from './components/routes/PrivateRoute';
import Register from './pages/Register';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Tasks /></PrivateRoute>} />
          <Route path="/rewards" element={<PrivateRoute><Rewards /></PrivateRoute>} />
        </Routes>
      </Router>
      <ToastContainer position="bottom-right" autoClose={5000} />
    </AuthProvider>
  );
};

export default App;
