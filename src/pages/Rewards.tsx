
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';

interface RewardsContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RewardsContent: React.FC<RewardsContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const { rewards, handleSaveReward, handleDeleteReward, isLoading } = useRewards();
  
  // Editor state
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);

  // Handle editing a reward
  const handleEdit = (index: number) => {
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
    console.log("Rewards.tsx - Saving reward:", rewardData);
    console.log("Rewards.tsx - Current reward index:", currentRewardIndex);
    
    await handleSaveReward(rewardData, currentRewardIndex);
    closeEditor();
  };

  // Handle deleting a reward
  const handleDelete = async (index: number) => {
    if (index !== null) {
      await handleDeleteReward(index);
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
      <RewardsHeader onAddNewReward={handleAddNewReward} />
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
