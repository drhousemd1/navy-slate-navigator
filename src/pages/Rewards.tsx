
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardCard from '@/components/RewardCard';
import RewardEditor from '@/components/RewardEditor';

interface RewardsContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RewardsContent: React.FC<RewardsContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const { rewards, handleSaveReward, handleDeleteReward, isLoading, refetchRewards } = useRewards();
  const [editingReward, setEditingReward] = useState(null);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState<NodeJS.Timeout | null>(null);

  // Ensure we have the latest data when component mounts
  useEffect(() => {
    console.log("RewardsContent mounted, refreshing data");
    refetchRewards();
  }, [refetchRewards]);

  const startGlobalTimer = useCallback(() => {
    const timer = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, 6000);
    setGlobalCarouselTimer(timer);
  }, []);

  useEffect(() => {
    if (!globalCarouselTimer) startGlobalTimer();
    return () => {
      if (globalCarouselTimer) clearInterval(globalCarouselTimer);
    };
  }, [globalCarouselTimer, startGlobalTimer]);

  if (isLoading && !rewards.length) {
    return (
      <div className="p-4 pt-6">
        <div className="flex justify-center mt-8">
          <div className="text-white text-center">Loading rewards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            onEdit={() => setEditingReward(reward)}
            carouselIndex={globalCarouselIndex}
          />
        ))}
      </div>
      
      {editingReward && (
        <RewardEditor
          reward={editingReward}
          onClose={() => setEditingReward(null)}
          globalCarouselTimer={globalCarouselTimer}
          onSave={handleSaveReward}
          onDelete={handleDeleteReward}
        />
      )}
    </div>
  );
};

const Rewards: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  return (
    <AppLayout onAddNewItem={() => setIsEditorOpen(true)}>
      <RewardsProvider>
        <RewardsContent 
          isEditorOpen={isEditorOpen}
          setIsEditorOpen={setIsEditorOpen}
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rewards;
