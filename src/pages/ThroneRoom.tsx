
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import WeeklyMetricsChart, { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsChart';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import { Card } from '@/components/ui/card';
import { InfoIcon, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useRewards } from '@/contexts/RewardsContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';

// Import extracted components
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const [metricsSummary, setMetricsSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesBroken: 0,
    rewardsRedeemed: 0,
    punishments: 0
  });
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const location = useLocation();
  
  const { rewards } = useRewards();

  // Force refresh when necessary
  useEffect(() => {
    // Create a function to refresh charts
    const triggerRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    // Set up interval for auto-refresh (every minute)
    const refreshInterval = setInterval(triggerRefresh, 60000);
    
    // Call once on mount
    triggerRefresh();
    
    // Clean up interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);
  
  // Also refresh when rewards change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [rewards, location.pathname]);
  
  // Handle data callback from the weekly metrics chart
  const handleMetricsDataLoaded = (summaryData: WeeklyMetricsSummary) => {
    setMetricsSummary(summaryData);
  };

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="space-y-6">
            {/* Weekly metrics section with key to force refresh */}
            <div className="space-y-2">
              <WeeklyMetricsChart 
                onDataLoaded={handleMetricsDataLoaded}
                key={`weekly-metrics-${refreshKey}`}
              />
              
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
