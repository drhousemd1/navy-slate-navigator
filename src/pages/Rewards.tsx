import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import { useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';
import { toast } from '@/hooks/use-toast';

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
        console.log("Editing reward at index:", index, "with data:", rewards[index]);
        // Store the index in the reward data so we can access it during delete
        const rewardWithIndex = {
            ...rewards[index],
            index: index
        };
        setCurrentReward(rewardWithIndex);
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
        console.log("Saving reward with data:", rewardData, "at index:", currentRewardIndex);
        try {
            // Log the order of rewards before saving
            console.log("Rewards order BEFORE saving:",
                rewards.map((r, i) => `${i}: ${r.title} (${r.id})`));

            await handleSaveReward(rewardData, currentRewardIndex);

            // Log the order of rewards after saving to verify it hasn't changed
            console.log("Rewards order AFTER saving:",
                rewards.map((r, i) => `${i}: ${r.title} (${r.id})`));

            toast({
                title: "Success",
                description: `Reward ${currentRewardIndex !== null ? 'updated' : 'created'} successfully`,
            });

            closeEditor();
        } catch (error) {
            console.error("Failed to save reward:", error);

            toast({
                title: "Error",
                description: "Failed to save reward. Please try again.",
                variant: "destructive",
            });

            // Re-throw to allow RewardEditor to show error message
            throw error;
        }
    };

    // Handle deleting a reward
    const handleDelete = async (index: number) => {
        console.log("Deleting reward at index:", index);
        try {
            await handleDeleteReward(index);

            toast({
                title: "Success",
                description: "Reward deleted successfully",
            });

            closeEditor();
        } catch (error) {
            console.error("Failed to delete reward:", error);

            toast({
                title: "Error",
                description: "Failed to delete reward. Please try again.",
                variant: "destructive",
            });

            throw error;
        }
    };

    const closeEditor = () => {
        console.log("Closing reward editor");
        setIsEditorOpen(false);
        setCurrentReward(null);
        setCurrentRewardIndex(null);
    };

    if (isLoading && !rewards.length) {
        return (
            <div className="p-4 pt-6">
                <RewardsHeader />
                <div className="flex justify-center mt-8">
                    <div className="text-white text-center">Loading rewards...</div>
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
                onDelete={currentRewardIndex !== null ? handleDelete : undefined}
            />
        </div>
    );
};

const Rewards: React.FC = () => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    return (
        <AppLayout onAddNewItem={() => setIsEditorOpen(true)}>
            <RewardsContent
                isEditorOpen={isEditorOpen}
                setIsEditorOpen={setIsEditorOpen}
            />
        </AppLayout>
    );
};

export default Rewards;
