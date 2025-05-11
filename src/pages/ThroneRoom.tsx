
import React, { useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsSummary';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import { Card } from '@/components/ui/card';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { useWeeklyMetrics } from '@/data/queries/useWeeklyMetrics';

// Import extracted components
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const { weeklyMetrics, refetch } = useWeeklyMetrics();
  
  // Force update data only when page is mounted or URL has ?fresh param
  useEffect(() => {
    // Add a check for URL params that indicate a fresh page load from reset
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fresh')) {
      console.log('Fresh page load detected after reset, force updating metrics');
      refetch();
      
      // Remove the 'fresh' param from URL to avoid re-triggering on navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.pathname, refetch]);

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="space-y-6">
            {/* Weekly activity graph */}
            <WeeklyMetricsChart />
            
            {/* Weekly metrics summary tiles */}
            <div className="space-y-2">
              <WeeklyMetricsSummaryTiles 
                tasksCompleted={weeklyMetrics.tasksCompleted}
                rulesBroken={weeklyMetrics.rulesBroken}
                rewardsRedeemed={weeklyMetrics.rewardsRedeemed}
                punishments={weeklyMetrics.punishments}
              />
            </div>
            
            <MonthlyMetricsChart />
            
            <AdminSettingsCard />
          </div>
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
