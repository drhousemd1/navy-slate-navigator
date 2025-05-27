import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor'; 
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { Reward, RewardFormValues } from '@/data/rewards/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRewardsData } from '@/data/rewards/useRewardsData'; 
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { Gift, LoaderCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

const RewardsPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const { 
    rewards, 
    isLoading, 
    error, 
    saveReward, // This comes from useRewardsData
    deleteReward, // This comes from useRewardsData
    buyRewardContext // Assuming buyReward is on context if needed directly here
  } = useRewardsData(); // Using the hook that provides save/delete
  
  const { refreshPointsFromDatabase } = useRewards(); // From context for points

  const handleAddReward = () => {
    setCurrentReward(null);
    setIsEditorOpen(true);
  };

  React.useEffect(() => {
    const element = document.querySelector('.RewardsContent');
    if (element) {
      const handleAddEvent = () => handleAddReward();
      element.addEventListener('add-new-reward', handleAddEvent);
      return () => element.removeEventListener('add-new-reward', handleAddEvent);
    }
  }, []);

  const handleEditReward = (reward: Reward) => {
    setCurrentReward(reward);
    setIsEditorOpen(true);
  };

  const handleSaveReward = async (formData: RewardFormValues) => {
    try {
      if (currentReward && currentReward.id) {
        await saveReward({ ...formData, id: currentReward.id });
      } else {
        await saveReward(formData); // saveReward from useRewardsData handles create/update logic
      }
      setIsEditorOpen(false);
      setCurrentReward(null);
    } catch (e: unknown) {
      const descriptiveMessage = getErrorMessage(e);
      logger.error('Error saving reward in UI:', descriptiveMessage, e);
      toast({ title: "Save Error", description: descriptiveMessage, variant: "destructive" });
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    try {
      await deleteReward(rewardId);
      setIsEditorOpen(false);
      setCurrentReward(null);
    } catch (e: unknown) {
      const descriptiveMessage = getErrorMessage(e);
      logger.error('Error deleting reward in UI:', descriptiveMessage, e);
      toast({ title: "Delete Error", description: descriptiveMessage, variant: "destructive" });
    }
  };
  
  const handleBuyReward = async (reward: Reward) => {
    if (buyRewardContext) { // Check if buyRewardContext is available
        try {
            await buyRewardContext(reward);
            // Toast for success/failure is handled within buyRewardContext or its underlying operations
        } catch (e:unknown) {
            const descriptiveMessage = getErrorMessage(e);
            logger.error('Error buying reward from page:', descriptiveMessage, e);
            // Toast might be redundant if already handled
        }
    } else {
        toast({title: "Action Unavailable", description: "Buying rewards is currently not available.", variant: "default"})
    }
  };


  useEffect(() => {
    if (refreshPointsFromDatabase) refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  let content;
  if (isLoading && rewards.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 mt-4">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rewards...</p>
      </div>
    );
  } else if (error && rewards.length === 0) {
    content = (
      <ErrorDisplay
        title="Error Loading Rewards"
        message={getErrorMessage(error) || "Could not fetch rewards."}
      />
    );
  } else if (!isLoading && rewards.length === 0 && !error) {
    content = (
      <EmptyState
        icon={Gift}
        title="No Rewards Yet"
        description="Create some rewards for users to earn."
        action={<Button onClick={handleAddReward}>Create New Reward</Button>}
      />
    );
  } else {
    content = (
      <RewardsList
        rewards={rewards}
        isLoading={false}
        onEditReward={handleEditReward}
        onBuyReward={handleBuyReward} // Pass it down
        error={error}
      />
    );
  }

  return (
    <div className="p-4 pt-6 RewardsContent">
      <RewardsHeader onAddNewReward={handleAddReward} />
      {content}
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentReward(null);
        }}
        rewardData={currentReward || undefined}
        onSave={handleSaveReward}
        onDelete={handleDeleteReward}
      />
    </div>
  );
};

const RewardsPage: React.FC = () => {
    const handleAddNewItem = () => {
    logger.debug('AppLayout onAddNewItem called for Rewards');
    const contentElement = document.querySelector('.RewardsContent');
    if (contentElement) {
      logger.debug('Dispatching add-new-reward event to .RewardsContent');
      const event = new CustomEvent('add-new-reward');
      contentElement.dispatchEvent(event);
    }
  };
  return (
    <AppLayout onAddNewItem={handleAddNewItem}>
      <RewardsProvider> {/* This provides refreshPointsFromDatabase, buyReward etc. */}
        <ErrorBoundary fallbackMessage="Could not load rewards.">
          <RewardsPageContent />
        </ErrorBoundary>
      </RewardsProvider>
    </AppLayout>
  );
};

export default RewardsPage;
