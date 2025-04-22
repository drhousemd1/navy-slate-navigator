
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTasksData } from '@/data/TasksDataHandler';
import { useRewardsData } from '@/data/RewardsDataHandler';
import { usePunishmentsData } from '@/data/PunishmentsDataHandler';
import { useRulesData } from '@/data/RulesDataHandler';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const HomePage = () => {
  const { user } = useAuth();
  const { tasks, isLoading: isLoadingTasks } = useTasksData();
  const { userPoints, isLoading: isLoadingRewards } = useRewardsData();
  const { punishments, isLoading: isLoadingPunishments } = usePunishmentsData();
  const { rules, isLoading: isLoadingRules } = useRulesData();

  const isLoading = isLoadingTasks || isLoadingRewards || isLoadingPunishments || isLoadingRules;

  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = tasks.length - completedTasks;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user?.email}</h2>
        <p className="text-gray-300">
          Track your progress, manage tasks, and earn rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Current Points" value={userPoints} />
        <StatCard title="Tasks" value={tasks.length} />
        <StatCard title="Rules" value={rules.length} />
        <StatCard title="Rewards" value={userPoints} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Tasks Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Completed Tasks</span>
              <span className="font-medium">{completedTasks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Pending Tasks</span>
              <span className="font-medium">{pendingTasks}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ 
                  width: tasks.length ? `${(completedTasks / tasks.length) * 100}%` : '0%' 
                }}
              ></div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickLinkCard title="Tasks" path="/tasks" bgColor="bg-blue-600" />
            <QuickLinkCard title="Rules" path="/rules" bgColor="bg-purple-600" />
            <QuickLinkCard title="Rewards" path="/rewards" bgColor="bg-green-600" />
            <QuickLinkCard title="Punishments" path="/punishments" bgColor="bg-red-600" />
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

interface StatCardProps {
  title: string;
  value: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
  return (
    <Card className="bg-slate-800 border-slate-700 p-6">
      <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </Card>
  );
};

interface QuickLinkCardProps {
  title: string;
  path: string;
  bgColor: string;
}

const QuickLinkCard: React.FC<QuickLinkCardProps> = ({ title, path, bgColor }) => {
  const navigate = useNavigate();
  
  return (
    <button 
      onClick={() => navigate(path)}
      className={`${bgColor} rounded-lg p-4 text-white font-medium hover:opacity-90 transition-opacity`}
    >
      {title}
    </button>
  );
};

export default HomePage;
