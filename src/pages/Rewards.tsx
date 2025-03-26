
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
  const { rewards, handleSaveReward, handleDeleteReward } = useRewards();
  
  // Editor state
  const [currentReward, setCurrentReward] = useState<any>(null);
  
  // Handle editing a reward
  const handleEdit = (reward: any) => {
    setCurrentReward(reward);
    setIsEditorOpen(true);
  };

  // Handle adding a new reward
  const handleAddNewReward = () => {
    setCurrentReward(null);
    setIsEditorOpen(true);
  };

  // Handle saving edited reward
  const handleSave = async (rewardData: any) => {
    const index = currentReward ? rewards.findIndex(r => r.id === currentReward.id) : null;
    await handleSaveReward(rewardData, index);
    closeEditor();
  };

  // Handle deleting a reward
  const handleDelete = (rewardId: string) => {
    if (rewardId) {
      handleDeleteReward(rewardId);
      closeEditor();
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentReward(null);
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
        onDelete={() => currentReward?.id && handleDelete(currentReward.id)}
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
