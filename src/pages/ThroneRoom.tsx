import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card } from '@/components/ui/card';
import { format, parseISO, startOfWeek, addDays, isSameWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  TooltipProvider, 
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { InfoIcon, ChevronDown, ChevronUp, Settings2, Skull, Crown, Swords, Award, Pencil } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRewards } from '@/contexts/RewardsContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ThroneRoomEditModal, { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { toast } from '@/hooks/use-toast';
import FrequencyTracker from '@/components/task/FrequencyTracker';
import PriorityBadge from '@/components/task/PriorityBadge';
import PointsBadge from '@/components/task/PointsBadge';
import TaskIcon from '@/components/task/TaskIcon';

// ----------------------------------------------------------------
// Chart Color Constants
// ----------------------------------------------------------------
const COLORS = {
  tasksCompleted: '#0ea5e9',
  rulesBroken: '#f97316',
  rewardsRedeemed: '#8b5cf6',
  punishments: '#ef4444',
};

// ----------------------------------------------------------------
// Tooltip Formatter (shared by both graphs)
// ----------------------------------------------------------------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm leading-snug text-white" style={{ background: 'transparent' }}>
        <p className="text-white font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ----------------------------------------------------------------
// Monthly Activity Chart
// ----------------------------------------------------------------
const MonthlyMetricsChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);

  const activityData = [
    { date: '2025-04-01', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
    { date: '2025-04-05', tasksCompleted: 2, rulesBroken: 1, rewardsRedeemed: 0, punishments: 0 },
    { date: '2025-04-10', tasksCompleted: 1, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
    { date: '2025-04-15', tasksCompleted: 4, rulesBroken: 2, rewardsRedeemed: 1, punishments: 1 },
    { date: '2025-04-20', tasksCompleted: 0, rulesBroken: 3, rewardsRedeemed: 0, punishments: 2 },
    { date: '2025-04-22', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
    { date: '2025-04-25', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
    { date: '2025-04-27', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  ];

  const handleClick = (data: any) => {
    const index = activityData.findIndex(d => d.date === data.activeLabel);
    if (chartRef.current) {
      const scrollAmount = index * 60 - chartRef.current.offsetWidth / 2 + 30;
      chartRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <Card className="p-4 w-full">
      <h2 className="text-xl font-semibold text-white mb-4">Monthly Activity</h2>
      <div ref={chartRef} className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: `${activityData.length * 60}px`, height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activityData}
              onClick={handleClick}
              margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: 'white' }} />
              <YAxis tick={{ fill: 'white' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="tasksCompleted" fill={COLORS.tasksCompleted} name="Tasks Completed" />
              <Bar dataKey="rulesBroken" fill={COLORS.rulesBroken} name="Rules Broken" />
              <Bar dataKey="rewardsRedeemed" fill={COLORS.rewardsRedeemed} name="Rewards Redeemed" />
              <Bar dataKey="punishments" fill={COLORS.punishments} name="Punishments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-around mt-4 text-sm text-white whitespace-nowrap">
        <span style={{ color: COLORS.tasksCompleted }}>Tasks Completed</span>
        <span style={{ color: COLORS.rulesBroken }}>Rules Broken</span>
        <span style={{ color: COLORS.rewardsRedeemed }}>Rewards Redeemed</span>
        <span style={{ color: COLORS.punishments }}>Punishments</span>
      </div>
    </Card>
  );
};

// ----------------------------------------------------------------
// Weekly Activity Graph + Tiles (split containers)
// ----------------------------------------------------------------

const WeeklyMetricsChart = () => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 });

  useEffect(() => {
    const loadData = async () => {
      const { data: completions } = await supabase.from('task_completion_history').select('*');
      const { data: rules } = await supabase.from('rule_violations').select('*');
      const { data: rewards } = await supabase.from('reward_usage').select('*');
      const { data: punishments } = await supabase.from('punishment_history').select('*');

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const chartData = Array.from({ length: 7 }).map((_, i) => {
        const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
        return {
          date,
          tasksCompleted: completions?.filter(d => format(parseISO(d.completed_at), 'yyyy-MM-dd') === date).length || 0,
          rulesBroken: rules?.filter(d => format(parseISO(d.violation_date), 'yyyy-MM-dd') === date).length || 0,
          rewardsRedeemed: rewards?.filter(d => format(parseISO(d.created_at || new Date().toISOString()), 'yyyy-MM-dd') === date).length || 0,
          punishments: punishments?.filter(d => format(parseISO(d.applied_date || new Date().toISOString()), 'yyyy-MM-dd') === date).length || 0,
        };
      });

      setData(chartData);

      const total = chartData.reduce(
        (acc, cur) => ({
          tasksCompleted: acc.tasksCompleted + cur.tasksCompleted,
          rulesBroken: acc.rulesBroken + cur.rulesBroken,
          rewardsRedeemed: acc.rewardsRedeemed + cur.rewardsRedeemed,
          punishments: acc.punishments + cur.punishments,
        }),
        summary
      );

      setSummary(total);
    };

    loadData();
  }, []);

  return (
    <>
      <Card className="p-4 w-full mt-6">
        <h2 className="text-xl font-semibold text-white mb-4">Weekly Activity</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: 'white' }} />
            <YAxis tick={{ fill: 'white' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="tasksCompleted" fill={COLORS.tasksCompleted} name="Tasks Completed" />
            <Bar dataKey="rulesBroken" fill={COLORS.rulesBroken} name="Rules Broken" />
            <Bar dataKey="rewardsRedeemed" fill={COLORS.rewardsRedeemed} name="Rewards Redeemed" />
            <Bar dataKey="punishments" fill={COLORS.punishments} name="Punishments" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4 w-full mt-4">
        <div className="grid grid-cols-2 gap-4 text-white text-center text-sm">
          <div className="bg-navy border border-light-navy p-3 rounded-lg">
            Tasks Completed: {summary.tasksCompleted}
          </div>
          <div className="bg-navy border border-light-navy p-3 rounded-lg">
            Rules Broken: {summary.rulesBroken}
          </div>
          <div className="bg-navy border border-light-navy p-3 rounded-lg">
            Rewards Redeemed: {summary.rewardsRedeemed}
          </div>
          <div className="bg-navy border border-light-navy p-3 rounded-lg">
            Punishments: {summary.punishments}
          </div>
        </div>
      </Card>
    </>
  );
};

// ----------------------------------------------------------------
// Main Page Render (ThroneRoom)
// ----------------------------------------------------------------

const ThroneRoom = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
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
  
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const { rewards } = useRewards();

  useEffect(() => {
    const stored = parseInt(localStorage.getItem('throneRoom_carouselTimer') || '5', 10);
    const interval = setInterval(() => {
      setCarouselIndex((prev) => prev + 1);
    }, (isNaN(stored) ? 5 : stored) * 1000);
    
    return () => clearInterval(interval);
  }, []);

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {defaultThroneRoomCards.map((card, index) => (
              <ThroneRoomCard
                key={index}
                id={card.id}
                title={card.title}
                description={card.description}
                icon={card.icon}
                priority={card.priority}
                points={card.points}
                globalCarouselIndex={carouselIndex}
              />
            ))}
          </div>
          
          <div className="space-y-6">
            <MonthlyMetricsChart />
            
            <WeeklyMetricsChart />

            <Card className="bg-navy border border-light-navy">
              <CardHeader className="border-b border-light-navy">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CardTitle className="text-white text-lg">Admin Settings</CardTitle>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-gray-400 ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-80">Configure global settings for your domain</p>
                        </TooltipContent>
                      </UITooltip>
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
