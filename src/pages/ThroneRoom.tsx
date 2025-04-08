
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

  useEffect(() => {
    console.log('Location changed or component mounted, refreshing metrics chart');
    setRefreshTrigger(prev => prev + 1);
  }, [location.pathname]);

  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [rewards]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleMetricsDataLoaded = (summaryData: WeeklyMetricsSummary) => {
    console.log('Metrics data loaded with summary:', summaryData);
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
            {/* Weekly metrics section - structure matches monthly section */}
            <div className="space-y-2">
              <WeeklyMetricsChart 
                onDataLoaded={handleMetricsDataLoaded}
                key={`metrics-chart-${refreshTrigger}`}
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
