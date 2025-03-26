
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';
import { Skeleton } from '../components/ui/skeleton';

interface RewardsContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RewardsContent: React.FC<RewardsContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const { rewards, handleSaveReward, handleDeleteReward, refreshRewards, loading } = useRewards();
  
  // Editor state
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);

  // Refresh rewards when this component mounts
  useEffect(() => {
    console.log("RewardsContent mounted, refreshing rewards...");
    refreshRewards();
  }, [refreshRewards]);

  // Handle editing a reward
  const handleEdit = (index: number) => {
    console.log("Editing reward at index:", index, "Reward data:", rewards[index]);
    setCurrentReward(rewards[index]);
    setCurrentRewardIndex(index);
    setIsEditorOpen(true);
  };

  // Handle adding a new reward
  const handleAddNewReward = () => {
    console.log("Adding new reward");
    setCurrentReward(null);
    setCurrentRewardIndex(null);
    setIsEditorOpen(true);
  };

  // Handle saving edited reward
  const handleSave = async (rewardData: any) => {
    console.log("Saving reward data:", rewardData, "at index:", currentRewardIndex);
    await handleSaveReward(rewardData, currentRewardIndex);
    closeEditor();
  };

  // Handle deleting a reward
  const handleDelete = (index: number) => {
    if (index !== null) {
      console.log("Deleting reward at index:", index);
      handleDeleteReward(index);
      closeEditor();
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentReward(null);
    setCurrentRewardIndex(null);
  };

  // Listen for "add-new-item" event from AppLayout
  useEffect(() => {
    const handleAddNewItem = () => {
      handleAddNewReward();
    };

    window.addEventListener('add-new-item', handleAddNewItem);
    
    return () => {
      window.removeEventListener('add-new-item', handleAddNewItem);
    };
  }, []);

  // Show loading state while rewards are being fetched
  if (loading) {
    return (
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-40 bg-gray-700" />
          <Skeleton className="h-8 w-24 rounded-full bg-gray-700" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 w-full rounded-lg bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

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

const Rewards: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Handle the "+" button click from AppLayout
  const handleAddNewItem = () => {
    console.log("Add new item clicked from AppLayout");
    
    // Dispatch a custom event that will be caught by RewardsContent
    window.dispatchEvent(new CustomEvent('add-new-item'));
    
    // Open the editor
    setIsEditorOpen(true);
  };
  
  return (
    <AppLayout onAddNewItem={handleAddNewItem}>
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
