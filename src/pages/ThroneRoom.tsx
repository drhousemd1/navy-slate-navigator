
import React, { useState, useEffect } from 'react';
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

// Import extracted components
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';
import { supabase } from '@/integrations/supabase/client';

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
    // Create a function to refresh 
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
  
  // Fetch summary data directly
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        // Get current week's start and end dates
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(today.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        // Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('*')
          .gte('completed_at', weekStart.toISOString())
          .lt('completed_at', weekEnd.toISOString());
          
        if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);
        
        // Fetch rule violations
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .gte('violation_date', weekStart.toISOString())
          .lt('violation_date', weekEnd.toISOString());
          
        if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);
        
        // Fetch reward usages
        const { data: rewardUsages, error: rewardError } = await supabase
          .from('reward_usage')
          .select('*')
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString());
          
        if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);
        
        // Fetch punishments
        const { data: punishments, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('*')
          .gte('applied_date', weekStart.toISOString())
          .lt('applied_date', weekEnd.toISOString());
          
        if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);
        
        // Calculate summary counts
        const summary: WeeklyMetricsSummary = {
          tasksCompleted: taskCompletions?.length || 0,
          rulesBroken: ruleViolations?.length || 0,
          rewardsRedeemed: rewardUsages?.length || 0,
          punishments: punishments?.length || 0
        };
        
        setMetricsSummary(summary);
      } catch (err) {
        console.error('Error fetching metrics summary data:', err);
      }
    };
    
    fetchSummaryData();
  }, [refreshKey]);

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
