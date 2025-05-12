
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Rules from './pages/Rules';
import Punishments from './pages/Punishments';
import Rewards from './pages/Rewards';
import AdminTesting from './pages/AdminTesting';
import Encyclopedia from './pages/Encyclopedia';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { clearOldCacheVersions } from './data/indexedDB/useIndexedDB';

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
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
