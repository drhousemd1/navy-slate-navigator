
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRewardsData } from '@/data/RewardsDataHandler';
import { Loader2 } from 'lucide-react';

const RewardsPage = () => {
  const { rewards, userPoints, isLoading } = useRewardsData();

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rewards</h1>
        <div className="bg-slate-800 px-4 py-2 rounded-lg">
          <span className="text-gray-400 mr-2">Current Points:</span>
          <span className="font-bold">{userPoints}</span>
        </div>
      </div>
      
      {rewards.length === 0 ? (
        <div className="text-center p-8 bg-slate-800 rounded-lg">
          <p className="text-gray-400">You don't have any rewards yet.</p>
          <p className="text-gray-400">Create your first reward to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => (
            <div 
              key={reward.id} 
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <h3 className="font-semibold mb-2">{reward.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{reward.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                  Cost: {reward.cost} points
                </span>
                <span className="text-xs text-gray-400">
                  Supply: {reward.supply}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default RewardsPage;
