import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { useAuth } from '@/contexts/auth';
import { useUserIds } from '@/contexts/UserIdsContext';
import ErrorBoundary from '../components/ErrorBoundary';

const Rewards: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const { user } = useAuth();
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const {
    rewards,
    isLoading,
    error,
    isUsingCachedData,
    checkAndReloadRewards
  } = useRewardsData();

  // Check for rewards resets on page load when user is available
  useEffect(() => {
    if (user) {
      checkAndReloadRewards();
    }
  }, [user, checkAndReloadRewards]);

  const handleCreateReward = () => {
    setEditingReward(null);
    setIsEditorOpen(true);
  };

  const handleEditReward = (reward) => {
    setEditingReward(reward);
    setIsEditorOpen(true);
  };

  const handleSaveReward = async (rewardData) => {
    // Save reward logic here
    setIsEditorOpen(false);
  };

  const handleDeleteReward = async (rewardId) => {
    // Delete reward logic here
    setIsEditorOpen(false);
  };

  return (
    <AppLayout onAddNewItem={handleCreateReward}>
      <ErrorBoundary fallbackMessage="Could not load rewards. Please try reloading.">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <RewardsHeader onCreateReward={handleCreateReward} />
          
          <RewardsList
            rewards={rewards}
            isLoading={isLoading}
            error={error}
            isUsingCachedData={isUsingCachedData}
            onEditReward={handleEditReward}
          />

          <RewardEditor
            isOpen={isEditorOpen}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingReward(null);
            }}
            rewardData={editingReward}
            onSave={handleSaveReward}
            onDelete={editingReward ? () => handleDeleteReward(editingReward.id) : undefined}
          />
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Rewards;
