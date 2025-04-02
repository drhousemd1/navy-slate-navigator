
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WeeklyMetricsChart } from '@/components/throne/WeeklyMetricsChart';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TooltipProvider, 
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const navigate = useNavigate();
  const [isRoleChecked, setIsRoleChecked] = useState(false);

  console.log('ThroneRoom rendering: Admin status:', isAdmin, 'Auth status:', isAuthenticated);

  // Make sure role check runs when authentication is confirmed
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('ThroneRoom: User authenticated, checking role');
      checkUserRole().then(() => {
        console.log('ThroneRoom: Role check completed');
        setIsRoleChecked(true);
      });
    }
  }, [isAuthenticated, loading, checkUserRole]);

  // TEMPORARY - ALWAYS SHOW CONTENT FOR DEBUGGING
  return (
    <AppLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Admin Throne Room</h1>
          <div className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-xl">
            THRONE ROOM TEST CONTENT
          </div>
        </div>
        
        <div className="bg-green-700 text-white p-4 rounded-lg mb-6">
          <p>Debug Info:</p>
          <p>isAdmin: {String(isAdmin)}</p>
          <p>isAuthenticated: {String(isAuthenticated)}</p>
          <p>loading: {String(loading)}</p>
          <p>roleChecked: {String(isRoleChecked)}</p>
        </div>
        
        <p className="text-nav-inactive mb-4">Welcome to your command center where you can track activities and manage your domain</p>
        
        <div className="space-y-6">
          {/* Weekly metrics chart */}
          <WeeklyMetricsChart />
          
          <div className="bg-navy border border-light-navy rounded-lg p-6">
            <h2 className="text-xl font-medium text-white mb-3">Admin Privileges</h2>
            <p className="text-nav-inactive">This area is restricted to administrators only.</p>
            <p className="text-green-400 mt-4">Your account has administrator privileges.</p>
            <p className="text-white bg-purple-900 inline-block p-2 mt-4 rounded">TEST - THRONE ROOM CONTENT</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ThroneRoom;
