import React, { useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsSummary';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import { Card } from '@/components/ui/card';
import { InfoIcon, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useRewards } from '@/contexts/RewardsContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary';

// Import extracted components
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const { rewards } = useRewards();
  const queryClient = useQueryClient();
  
  // Use the new custom hook for fetching summary data
  const { data: metricsSummaryData, isLoading, error } = useWeeklyMetricsSummary();

  // Handle default value for metricsSummary if data is not yet available or an error occurred
  const metricsSummary: WeeklyMetricsSummary = metricsSummaryData || { 
    tasksCompleted: 0, 
    rulesBroken: 0, 
    rewardsRedeemed: 0, 
    punishments: 0 
  };
  
  // Force update data only when page is mounted or URL has ?fresh param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fresh')) {
      console.log('Fresh page load detected after reset, force updating metrics');
      
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      
      // Remove the 'fresh' param from URL to avoid re-triggering on navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.pathname, queryClient]);

  // Optional: Add loading and error states based on `isLoading` and `error` from the hook
  if (isLoading) {
    // You could return a skeleton loader here, for example
    // For now, it will use the default metricsSummary values which are 0s
  }

  if (error) {
    // You could display an error message here
    console.error("Error fetching weekly metrics:", error);
    // It will use the default metricsSummary values (0s) or what fetchWeeklyMetricsSummary returns on error
  }

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
                tasksCompleted={metricsSummary.tasksCompleted}
                rulesBroken={metricsSummary.rulesBroken}
                rewardsRedeemed={metricsSummary.rewardsRedeemed}
                punishments={metricsSummary.punishments}
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
