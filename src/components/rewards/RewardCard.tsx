import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import RewardEditor from '../RewardEditor';
import { cn } from '@/lib/utils';
import RewardCardHeader from './RewardHeader';
import RewardContent from './RewardContent';
import RewardFooter from './RewardFooter';
import RewardBackground from './RewardBackground';
import { usePointsManagement } from '@/contexts/rewards/usePointsManagement';
import { useToast } from '@/hooks/use-toast';
import { useRewardOperations } from '@/contexts/rewards/useRewardOperations';
import { Dayjs } from 'dayjs';
import { getMondayBasedDay } from '@/lib/utils';
import dayjs from 'dayjs';

interface RewardCardProps {
    title: string;
    description: string;
    points: number;
    icon?: React.ReactNode;
    id?: string;
    icon_name?: string;
    icon_color?: string;
    title_color?: string;
    subtext_color?: string;
    calendar_color?: string;
    highlight_effect?: boolean;
    background_image_url?: string;
    background_opacity?: number;
    focal_point_x?: number;
    focal_point_y?: number;
}

interface UseRewardCardProps {
    id: string;
    points: number;
}

interface UseRewardCardReturn {
    isEditorOpen: boolean;
    setIsEditorOpen: (isOpen: boolean) => void;
    weekData: boolean[];
    handleUseReward: () => Promise<void>;
    handleEdit: () => void;
    handleSaveReward: (data: any) => Promise<void>;
    handleDeleteReward: () => Promise<void>;
    handleClearWeekData: () => Promise<void>;
}

const useRewardCard = ({ id, points }: UseRewardCardProps): UseRewardCardReturn => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const { spendPoints } = usePointsManagement();
    const { toast } = useToast();
    const { updateReward, deleteReward } = useRewardOperations();
    const [weekData, setWeekData] = useState<boolean[]>([false, false, false, false, false, false, false]);

    useEffect(() => {
        // Initialize week data from database or default to false
        // You'll need to fetch the initial week data here
        // For now, we'll just initialize it to all false
        // In a real app, you'd replace this with a database fetch
        setWeekData([false, false, false, false, false, false, false]);
    }, []);

    const updateWeekData = useCallback((dayIndex: number, newValue: boolean) => {
        setWeekData(prevWeekData => {
            const newWeekData = [...prevWeekData];
            newWeekData[dayIndex] = newValue;
            return newWeekData;
        });
    }, []);

    const handleUseReward = useCallback(async () => {
        try {
            await spendPoints(points);

            const today = getMondayBasedDay();
            const dayIndex = today;
            updateWeekData(dayIndex, true);

            await updateReward(id, {
                week_data: { [dayIndex]: true }
            });

            toast({
                title: 'Reward Used',
                description: 'You have used this reward!'
            });
        } catch (error) {
            console.error('Error using reward:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not use reward.'
            });
        }
    }, [id, points, spendPoints, toast, updateReward, updateWeekData]);

    const handleClearWeekData = useCallback(async () => {
        try {
            setWeekData([false, false, false, false, false, false, false]);
            await updateReward(id, {
                week_data: [false, false, false, false, false, false, false]
            });
            toast({
                title: 'Reward Usage Cleared',
                description: 'Your reward usage for the week has been reset.'
            });
        } catch (error) {
            console.error('Error clearing reward usage:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not clear reward usage.'
            });
        }
    }, [id, updateReward, toast]);

    const handleEdit = () => {
        setIsEditorOpen(true);
    };

    const handleSaveReward = async (data: any) => {
        try {
            await updateReward(id, data);
            setIsEditorOpen(false);
            toast({
                title: 'Reward Saved',
                description: 'Reward has been updated.'
            });
        } catch (error) {
            console.error('Error saving reward:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not save reward.'
            });
        }
    };

    const handleDeleteReward = async () => {
        try {
            await deleteReward(id);
            toast({
                title: 'Reward Deleted',
                description: 'Reward has been deleted.'
            });
        } catch (error) {
            console.error('Error deleting reward:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not delete reward.'
            });
        }
    };

    return {
        isEditorOpen,
        setIsEditorOpen,
        weekData,
        handleUseReward,
        handleEdit,
        handleSaveReward,
        handleDeleteReward,
        handleClearWeekData
    };
};

const RewardCard: React.FC<RewardCardProps> = ({
    title,
    description,
    points,
    id,
    icon_name,
    icon_color = '#ea384c',
    title_color = '#FFFFFF',
    subtext_color = '#8E9196',
    calendar_color = '#ea384c',
    highlight_effect = false,
    background_image_url,
    background_opacity = 50,
    focal_point_x = 50,
    focal_point_y = 50
}) => {
    const {
        isEditorOpen,
        setIsEditorOpen,
        weekData,
        handleUseReward,
        handleEdit,
        handleSaveReward,
        handleDeleteReward,
        handleClearWeekData
    } = useRewardCard({ id, points });

    return (
        <>
            <Card className="relative overflow-hidden border-2 border-blue-500 bg-navy">
                <RewardBackground
                    background_image_url={background_image_url}
                    background_opacity={background_opacity}
                    focal_point_x={focal_point_x}
                    focal_point_y={focal_point_y}
                />

                <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
                    <RewardCardHeader
                        points={points}
                        onUse={handleUseReward}
                    />

                    <RewardContent
                        icon_name={icon_name}
                        icon_color={icon_color}
                        title={title}
                        description={description}
                        title_color={title_color}
                        subtext_color={subtext_color}
                        highlight_effect={highlight_effect}
                    />

                    <RewardFooter
                        usageData={weekData}
                        calendarColor={calendar_color}
                        onClear={handleClearWeekData}
                        onEdit={handleEdit}
                    />
                </div>
            </Card>

            <RewardEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                rewardData={{
                    id,
                    title,
                    description,
                    points,
                    icon_name,
                    icon_color,
                    title_color,
                    subtext_color,
                    calendar_color,
                    highlight_effect,
                    background_image_url,
                    background_opacity,
                    focal_point_x,
                    focal_point_y
                }}
                onSave={handleSaveReward}
                onDelete={handleDeleteReward}
            />
        </>
    );
};

export default RewardCard;
