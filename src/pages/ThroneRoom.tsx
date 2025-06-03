
import React, { useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '@/contexts/auth';
import { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsSummary'; 
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary'; 
import { useWeeklyMetrics } from '@/data/queries/metrics/useWeeklyMetrics';
import { useMonthlyMetrics } from '@/data/queries/metrics/useMonthlyMetrics';
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';
import { logger } from '@/lib/logger'; // Added logger import

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  useWeeklyMetrics({ enabled: true });
  useMonthlyMetrics({ enabled: true });
  
  const { data: metricsSummaryData, isLoading, error } = useWeeklyMetricsSummary();

  const metricsSummary: WeeklyMetricsSummary = metricsSummaryData || { 
    tasksCompleted: 0, 
    rulesBroken: 0, 
    rewardsRedeemed: 0, 
    punishments: 0 
  };
  
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

  if (isLoading) {
    // Placeholder for loading state
  }

  if (error) {
    logger.error("Error fetching weekly metrics summary:", error);
  }

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in overflow-x-hidden w-full max-w-full">
          <p className="text-nav-inactive break-words">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="space-y-6 w-full max-w-full overflow-x-hidden">
            <div className="w-full max-w-full overflow-x-hidden">
              <WeeklyMetricsChart />
            </div>
            
            <div className="space-y-2 w-full max-w-full overflow-x-hidden">
              <WeeklyMetricsSummaryTiles 
                tasksCompleted={metricsSummary.tasksCompleted}
                rulesBroken={metricsSummary.rulesBroken}
                rewardsRedeemed={metricsSummary.rewardsRedeemed}
                punishments={metricsSummary.punishments}
              />
            </div>
            
            <div className="w-full max-w-full overflow-x-hidden">
              <MonthlyMetricsChart />
            </div>
            
            <div className="w-full max-w-full overflow-x-hidden">
              <AdminSettingsCard />
            </div>
          </div>
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
