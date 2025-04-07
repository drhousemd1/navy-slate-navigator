
import React from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import WeeklySummaryTiles from '@/components/throne/WeeklySummaryTiles';
import { RewardsProvider } from '@/contexts/RewardsContext';

const ThroneRoom: React.FC = () => {
  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          {/* Royal Achievements Container */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-md">
            <h2 className="text-xl font-semibold text-white mb-2">Royal Achievements</h2>
            <p className="text-slate-400">View your earned honors and merits.</p>
          </div>
          
          {/* Weekly Activity Graph + Title */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-md">
            <h2 className="text-xl font-semibold text-white mb-4">Weekly Activity</h2>
            <WeeklyMetricsChart />
          </div>
          
          {/* Weekly Activity Tiles */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-md">
            <WeeklySummaryTiles />
          </div>
          
          {/* Monthly Activity Container */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-md overflow-x-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Monthly Activity</h2>
            <MonthlyMetricsChart />
          </div>
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
