
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';

// This component uses the useRewards hook so it must be inside the RewardsProvider
const RewardsContent: React.FC = () => {
  const { rewards, handleSaveReward, handleDeleteReward } = useRewards();
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);

  // Handle editing a reward
  const handleEdit = (index: number) => {
    console.log('Editing reward at index:', index, 'with data:', rewards[index]);
    setCurrentReward(rewards[index]);
    setCurrentRewardIndex(index);
    setIsEditorOpen(true);
  };

  // Handle adding a new reward
  const handleAddNewReward = () => {
    setCurrentReward(null);
    setCurrentRewardIndex(null);
    setIsEditorOpen(true);
  };

  // Handle saving edited reward
  const handleSave = async (rewardData: any) => {
    console.log('Saving reward in Rewards.tsx:', rewardData, 'at index:', currentRewardIndex);
    await handleSaveReward(rewardData, currentRewardIndex);
    closeEditor();
  };

  // Handle deleting a reward
  const handleDelete = (index: number) => {
    if (index !== null) {
      handleDeleteReward(index);
      closeEditor();
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentReward(null);
    setCurrentRewardIndex(null);
  };

  return (
    <div className="p-4 pt-6">
      <RewardsHeader />
      <RewardsList onEdit={handleEdit} />
      
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        rewardData={currentReward}
        onSave={handleSave}
        onDelete={() => currentRewardIndex !== null && handleDelete(currentRewardIndex)}
      />
    </div>
  );
};

// Main component that wraps everything with the RewardsProvider
const Rewards: React.FC = () => {
  return (
    <AppLayout onAddNewItem={() => {
      // Find the RewardsContent component instance and call handleAddNewReward
      // We need to use a different approach since RewardsContent now manages its own state
      // and we can't pass setIsEditorOpen directly
      
      // Create a custom event to trigger adding a new reward
      const event = new CustomEvent('add-new-reward');
      document.dispatchEvent(event);
    }}>
      <RewardsProvider>
        <RewardsContent />
      </RewardsProvider>
    </AppLayout>
  );
};

// Listen for the custom event to add a new reward
// This is needed because AppLayout's onAddNewItem can't directly access RewardsContent's state
document.addEventListener('add-new-reward', () => {
  // Find and click an invisible button that will trigger adding a new reward
  const addButton = document.getElementById('add-new-reward-button');
  if (addButton) {
    addButton.click();
  }
});

export default Rewards;
