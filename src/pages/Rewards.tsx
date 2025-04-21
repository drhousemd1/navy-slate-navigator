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

    const handleSave = async (rewardData: any) => {
        await handleSaveReward(rewardData);
        closeEditor();
    };

    // Handle deleting a reward
    const handleDelete = async (reward: any) => {
        await handleDeleteReward(reward.id);
        closeEditor();
    };

    const closeEditor = () => {
        setIsEditorOpen(false);
        setCurrentReward(null);
    };

    if (isLoading) {
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
                onDelete={currentReward ? handleDelete : undefined}
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
