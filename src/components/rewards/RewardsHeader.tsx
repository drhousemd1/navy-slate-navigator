
import React from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { Award } from 'lucide-react';

const RewardsHeader = () => {
  const { totalPoints } = useRewards();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Rewards</h1>
            <p className="text-gray-400">Manage your rewards and incentives</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-300 px-4 py-2 rounded-lg">
          <span className="text-xs text-amber-900 uppercase font-bold">Available Points</span>
          <div className="text-2xl font-bold text-white">{totalPoints}</div>
        </div>
      </div>
    </div>
  );
};

export default RewardsHeader;
