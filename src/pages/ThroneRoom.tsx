
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import WeeklyMetricsChart, { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsChart';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import { 
  TooltipProvider, 
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { InfoIcon, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRewards } from '@/contexts/RewardsContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// Import extracted components
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const [metricsSummary, setMetricsSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesBroken: 0,
    rewardsRedeemed: 0,
    punishments: 0
  });
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const location = useLocation();
  
  const { rewards } = useRewards();

  // Force refresh when location changes or component mounts
  useEffect(() => {
    console.log('ThroneRoom: Location changed or component mounted, refreshing metrics chart');
    setRefreshTrigger(prev => prev + 1);
  }, [location.pathname]);

  // Force refresh when rewards change
  useEffect(() => {
    console.log('ThroneRoom: Rewards changed, refreshing metrics chart');
    setRefreshTrigger(prev => prev + 1);
  }, [rewards]);

  // Set up auto-refresh interval
  useEffect(() => {
    console.log('ThroneRoom: Setting up interval for refreshing metrics');
    const interval = setInterval(() => {
      console.log('ThroneRoom: Auto-refresh triggered');
      setRefreshTrigger(prev => prev + 1);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleMetricsDataLoaded = (summaryData: WeeklyMetricsSummary) => {
    console.log('ThroneRoom: Metrics data loaded with summary:', summaryData);
    setMetricsSummary(summaryData);
    setChartLoading(false);
  };

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="space-y-6">
            {/* Weekly metrics section with explicit key to force refresh */}
            <div className="space-y-2">
              <WeeklyMetricsChart 
                onDataLoaded={handleMetricsDataLoaded}
                key={`weekly-metrics-chart-${refreshTrigger}`}
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
