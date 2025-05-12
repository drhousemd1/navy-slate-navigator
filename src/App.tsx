
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

// Create a simple Dashboard component since it doesn't exist
const Dashboard = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
    <p>Welcome to your kingdom dashboard!</p>
  </div>
);

// Create a simple Login component since it doesn't exist
const Login = () => (
  <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[80vh]">
    <h1 className="text-2xl font-bold mb-6">Login</h1>
    <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-md">
      <p className="text-center mb-4">Please log in to continue</p>
      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
        Log In
      </button>
    </div>
  </div>
);

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
      <Route path="/throne-room" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
