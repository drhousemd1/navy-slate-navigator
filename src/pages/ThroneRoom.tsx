import React, { useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '@/contexts/auth';
import { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsSummary';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklyMetricsSummary, WeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary';
import { useWeeklyMetrics } from '@/data/queries/metrics/useWeeklyMetrics';
import { useMonthlyMetrics } from '@/data/queries/metrics/useMonthlyMetrics';

// Import extracted components
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Enable the detailed metrics queries when this page is active
  useWeeklyMetrics({ enabled: true });
  useMonthlyMetrics({ enabled: true });
  
  // This summary hook might have its own fetching logic. If it relies on the above, it's fine.
  // If it fetches independently and polls, it would need similar adjustments (but it's read-only for me).
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
      console.log('Fresh page load detected after reset, force updating metrics');
      // Invalidate all relevant metrics queries
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.pathname, queryClient]);

  if (isLoading) {
    // Placeholder for loading state
    // The individual charts (WeeklyMetricsChart, MonthlyMetricsChart) have their own skeletons
    // This isLoading is for the summary.
  }

  if (error) {
    console.error("Error fetching weekly metrics summary:", error);
    // Toasting for error is likely handled within useWeeklyMetricsSummary hook
  }

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="space-y-6">
            <WeeklyMetricsChart /> {/* This will use the now-controlled useWeeklyMetrics */}
            
            <div className="space-y-2">
              <WeeklyMetricsSummaryTiles 
                tasksCompleted={metricsSummary.tasksCompleted}
                rulesBroken={metricsSummary.rulesBroken}
                rewardsRedeemed={metricsSummary.rewardsRedeemed}
                punishments={metricsSummary.punishments}
              />
            </div>
            
            <MonthlyMetricsChart /> {/* This will use the now-controlled useMonthlyMetrics */}
            
            <AdminSettingsCard />
          </div>
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
