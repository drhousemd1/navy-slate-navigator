
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsList from '@/components/rewards/RewardsList';
import { RewardEditor } from '@/components/RewardEditor';

interface RewardsContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RewardsContent: React.FC<RewardsContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const { rewards, handleSaveReward, handleDeleteReward, isLoading, refetchRewards } = useRewards();
  const [editingReward, setEditingReward] = useState(null);
  const [editingRewardIndex, setEditingRewardIndex] = useState<number | null>(null);
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

  const handleEditReward = (index: number) => {
    setEditingReward(rewards[index]);
    setEditingRewardIndex(index);
  };

  const handleCloseEditor = () => {
    setEditingReward(null);
    setEditingRewardIndex(null);
  };

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
      <RewardsList onEdit={handleEditReward} />
      
      {editingReward && editingRewardIndex !== null && (
        <RewardEditor
          reward={editingReward}
          onClose={handleCloseEditor}
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
