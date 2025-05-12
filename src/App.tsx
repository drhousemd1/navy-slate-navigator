
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import { clearOldCacheVersions } from './data/indexedDB/useIndexedDB';

// Import pages from their actual locations
import Tasks from './pages/Tasks';
import Rules from './pages/Rules';
import Punishments from './pages/Punishments';
import Rewards from './pages/Rewards';
import AdminTesting from './pages/AdminTesting';
import Encyclopedia from './pages/Encyclopedia';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import ThroneRoom from './pages/ThroneRoom';
import Auth from './pages/auth';

// Create a simple Dashboard component that redirects to ThroneRoom
import { Navigate } from 'react-router-dom';
const Dashboard = () => <Navigate to="/throne-room" replace />;

// Create a simple Login component that redirects to Auth page
const Login = () => <Navigate to="/auth" replace />;

function App() {
  // Clear old cache versions when app loads
  useEffect(() => {
    const clearCache = async () => {
      console.log("App mounted, clearing old cache versions...");
      await clearOldCacheVersions();
    };
    
    clearCache();
  }, []);
  
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="/punishments" element={<Punishments />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/encyclopedia" element={<Encyclopedia />} />
      <Route path="/admin-testing" element={<AdminTesting />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/throne-room" element={<ThroneRoom />} />
      <Route path="/auth" element={<Auth />} />
    </Routes>
  );
}

export default App;
