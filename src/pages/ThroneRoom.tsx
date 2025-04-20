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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';
import { getSupabaseClient } from '@/integrations/supabase/client';

const ThroneRoom: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const { rewards } = useRewards();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    queryClient.clear();
    queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
    console.log('ThroneRoom mounted: Cleared all cached data to force fresh fetch');
  }, [queryClient]);
  
  const fetchSummaryData = async (): Promise<WeeklyMetricsSummary> => {
    try {
      const today = new Date();
      const diff = today.getDay();
      const mondayDiff = diff === 0 ? -6 : 1 - diff;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayDiff);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      console.log('Fetching weekly data from', weekStart.toISOString(), 'to', weekEnd.toISOString());
      
      const { data: taskCompletions, error: taskError } = await getSupabaseClient()
        .from('task_completion_history')
        .select('task_id, completed_at')
        .gte('completed_at', weekStart.toISOString())
        .lt('completed_at', weekEnd.toISOString());
        
      if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);
      
      const uniqueTasksPerDay = new Set();
      taskCompletions?.forEach(completion => {
        const dateKey = format(new Date(completion.completed_at), 'yyyy-MM-dd') + '-' + completion.task_id;
        uniqueTasksPerDay.add(dateKey);
      });
      
      const { data: ruleViolations, error: ruleError } = await getSupabaseClient()
        .from('rule_violations')
        .select('*')
        .gte('violation_date', weekStart.toISOString())
        .lt('violation_date', weekEnd.toISOString());
        
      if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);
      
      const { data: rewardUsages, error: rewardError } = await getSupabaseClient()
        .from('reward_usage')
        .select('*')
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString());
        
      if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);
      
      const { data: punishments, error: punishmentError } = await getSupabaseClient()
        .from('punishment_history')
        .select('*')
        .gte('applied_date', weekStart.toISOString())
        .lt('applied_date', weekEnd.toISOString());
        
      if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);
      
      return {
        tasksCompleted: uniqueTasksPerDay.size || 0,
        rulesBroken: ruleViolations?.length || 0,
        rewardsRedeemed: rewardUsages?.length || 0,
        punishments: punishments?.length || 0
      };
    } catch (err) {
      console.error('Error fetching metrics summary data:', err);
      return {
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0
      };
    }
  };
  
  const { data: metricsSummary = { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 }, 
          refetch } = useQuery({
    queryKey: ['weekly-metrics-summary'],
    queryFn: fetchSummaryData,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
    refetch();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fresh')) {
      console.log('Fresh page load detected after reset, force clearing all caches');
      localStorage.clear();
      sessionStorage.clear();
      queryClient.clear();
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.pathname, refetch, queryClient]);

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="space-y-6">
            <WeeklyMetricsChart />
            
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
