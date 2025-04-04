
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WeeklyMetricsChart } from '@/components/throne/WeeklyMetricsChart';
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

interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesViolated: number;
  rewardsUsed: number;
  punishmentsApplied: number;
}

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [metricsSummary, setMetricsSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesViolated: 0,
    rewardsUsed: 0,
    punishmentsApplied: 0
  });
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const location = useLocation();
  
  const { rewards } = useRewards();

  // Refresh when we navigate to this page
  useEffect(() => {
    console.log('Location changed or component mounted, refreshing metrics chart');
    setRefreshTrigger(prev => prev + 1);
  }, [location.pathname]);

  // Set up a refresh mechanism for when a rule is broken or a reward is used
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [rewards]);

  // Set up a refresh interval for the metrics chart
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 60000); // Refresh every minute
    
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
            {/* Dashboard section */}
            <Card className="bg-navy border border-light-navy">
              <CardHeader className="border-b border-light-navy">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg">Weekly Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-0">
                {/* Weekly metrics chart with responsive container */}
                <div className="w-full">
                  <WeeklyMetricsChart 
                    hideTitle={true} 
                    onDataLoaded={handleMetricsDataLoaded}
                    key={`metrics-chart-${refreshTrigger}`}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-6 px-6">
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sky-400 text-sm">Tasks Completed:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.tasksCompleted}</span>
                    </div>
                  </div>
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-500 text-sm">Rules Broken:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.rulesViolated}</span>
                    </div>
                  </div>
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 text-sm">Rewards Redeemed:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.rewardsUsed}</span>
                    </div>
                  </div>
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 text-sm">Punishments:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.punishmentsApplied}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-navy border border-light-navy">
              <CardHeader className="border-b border-light-navy">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CardTitle className="text-white text-lg">Admin Settings</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-gray-400 ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-80">Configure global settings for your domain</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showSettings ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
              </CardHeader>
              {showSettings && (
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white">Access Control</h3>
                        <p className="text-sm text-nav-inactive">Manage user roles and permissions</p>
                      </div>
                      <Settings2 className="text-cyan-400 h-5 w-5" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white">Global Rules</h3>
                        <p className="text-sm text-nav-inactive">Define system-wide rule settings</p>
                      </div>
                      <Settings2 className="text-cyan-400 h-5 w-5" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white">Notifications</h3>
                        <p className="text-sm text-nav-inactive">Configure notification preferences</p>
                      </div>
                      <Settings2 className="text-cyan-400 h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
