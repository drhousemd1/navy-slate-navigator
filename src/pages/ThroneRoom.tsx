
import React, { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '@/contexts/auth';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import UnifiedMetricsChart from '@/components/throne/UnifiedMetricsChart';
import UnifiedMetricsTiles from '@/components/throne/UnifiedMetricsTiles';
import WellbeingLineChart from '@/components/throne/WellbeingLineChart';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isLoadingUserIds } = useUserIds();
  const [isMonthlyView, setIsMonthlyView] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fresh')) {
      logger.debug('Fresh page load detected after reset, force updating metrics');
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.pathname, queryClient]);

  if (isLoadingUserIds) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6 animate-fade-in overflow-x-hidden w-full max-w-full">
          <div className="flex items-center justify-center h-60 text-white">
            Loading your command center...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 animate-fade-in overflow-x-hidden w-full max-w-full">
        <p className="text-nav-inactive break-words">
          Welcome to your command center where you can track activities and manage your domain
        </p>
        
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="w-full max-w-full overflow-x-hidden">
            <WellbeingLineChart 
              isMonthlyView={isMonthlyView} 
              onToggleView={setIsMonthlyView} 
            />
          </div>
          
          <div className="w-full max-w-full overflow-x-hidden">
            <UnifiedMetricsChart 
              isMonthlyView={isMonthlyView} 
              onToggleView={setIsMonthlyView} 
            />
          </div>
          
          <div className="space-y-2 w-full max-w-full overflow-x-hidden">
            <UnifiedMetricsTiles isMonthlyView={isMonthlyView} />
          </div>
          
          <div className="w-full max-w-full overflow-x-hidden">
            <AdminSettingsCard />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ThroneRoom;
