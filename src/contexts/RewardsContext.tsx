import React, { useState, useCallback, useEffect } from 'react';
import { Reward } from '@/lib/rewardUtils';
import { supabase } from '@/integrations/supabase/client';
import { RewardsContextType } from './rewardTypes';
import { usePointsManagement } from './usePointsManagement';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Function to fetch rewards from the database
const fetchRewards = async (): Promise<Reward[]> => {
    const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching rewards:', error);
        throw error;
    }

    return data as Reward[];
};

// Function to save a reward to the database
const saveReward = async (reward: Reward): Promise<Reward> => {
    const {
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
        focal_point_y,
    } = reward;

    if (id) {
        // Update existing reward
        const { data, error } = await supabase
            .from('rewards')
            .update({
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
                focal_point_y,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating reward:', error);
            throw error;
        }
        return data as Reward;
    } else {
        // Create new reward
        const { data, error } = await supabase
            .from('rewards')
            .insert([
                {
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
                    focal_point_y,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating reward:', error);
            throw error;
        }
        return data as Reward;
    }
};

// Function to delete a reward from the database
const deleteReward = async (rewardId: string): Promise<void> => {
    const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

    if (error) {
        console.error('Error deleting reward:', error);
        throw error;
    }
};

const RewardsContext = createContext<RewardsContextType>({
    rewards: [],
    rewardUsageMap: {}, // default empty object
    totalPoints: 0,
    totalRewardsSupply: 0,
    setTotalPoints: () => { },
    isLoading: true,
    refetchRewards: async () => { },
    handleSaveReward: async () => null,
    handleDeleteReward: async () => false,
    handleBuyReward: async () => { },
    handleUseReward: async () => { },
    refreshPointsFromDatabase: async () => { },
});

export const useRewards = () => useContext(RewardsContext);

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [totalPoints, setTotalPoints] = useState<number>(0);
    const queryClient = useQueryClient();
    const [rewardUsageMap, setRewardUsageMap] = useState({});
    const [fetchedRewards, setFetchedRewards] = useState<Reward[]>([]);

    // Fetch rewards using React Query
    const { isLoading, refetch } = useQuery({
        queryKey: ['rewards'],
        queryFn: fetchRewards,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        onSuccess: (data) => {
            setFetchedRewards(data);
        },
        onError: (error: any) => {
            console.error('Error fetching rewards:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch rewards. Please try again.',
                variant: 'destructive',
            });
        },
    });

    // Mutations for saving and deleting rewards
    const saveRewardMutation = useMutation({
        mutationFn: saveReward,
        onSuccess: () => {
            // Invalidate the rewards query to refetch the data
            queryClient.invalidateQueries(['rewards']);
            toast({
                title: 'Success',
                description: 'Reward saved successfully!',
            });
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to save reward. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const deleteRewardMutation = useMutation({
        mutationFn: deleteReward,
        onSuccess: () => {
            // Invalidate the rewards query to refetch the data
            queryClient.invalidateQueries(['rewards']);
            toast({
                title: 'Success',
                description: 'Reward deleted successfully!',
            });
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to delete reward. Please try again.',
                variant: 'destructive',
            });
        },
    });

    // Handlers for saving and deleting rewards
    const handleSaveReward = async (reward: Reward) => {
        saveRewardMutation.mutate(reward);
    };

    const handleDeleteReward = async (rewardId: string) => {
        deleteRewardMutation.mutate(rewardId);
    };

    const getTotalRewardsSupply = useCallback(() => {
        if (!rewards) return 0;
        return rewards.reduce((acc, reward) => acc + reward.points, 0);
    }, [rewards]);

    const refreshPointsFromDatabase = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (error) {
                console.error('Error fetching profile points:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to refresh points. Please try again.',
                    variant: 'destructive',
                });
            } else {
                setTotalPoints(data?.points || 0);
            }
        } catch (error) {
            console.error('Error refreshing points:', error);
            toast({
                title: 'Error',
                description: 'Failed to refresh points. Please try again.',
                variant: 'destructive',
            });
        }
    }, [setTotalPoints]);

    const handleBuyReward = async () => {
        //TODO: Implment handleBuyReward
    }

    const handleUseReward = async () => {
        //TODO: Implement handleUseReward
    }

    // Effect to update rewards from fetched data
    useEffect(() => {
        if (fetchedRewards.length > 0) {
            console.log("[RewardsContext] Setting rewards from fetchedRewards with preserved order:",
                fetchedRewards.map((r, i) => ({
                    position: i,
                    id: r.id,
                    title: r.title,
                    created_at: r.created_at
                }))
            );
            setRewards(fetchedRewards);
        }
    }, [fetchedRewards, setRewards]);

    // Add an effect to refresh points on mount
    useEffect(() => {
        refreshPointsFromDatabase();
    }, [refreshPointsFromDatabase]);

    const value = {
        rewards,
        rewardUsageMap, // Provide rewardUsageMap in context value
        totalPoints,
        totalRewardsSupply: getTotalRewardsSupply(),
        setTotalPoints,
        isLoading,
        refetchRewards: refetch,
        handleSaveReward,
        handleDeleteReward,
        handleBuyReward,
        handleUseReward,
        refreshPointsFromDatabase,
    };

    return (
        <RewardsContext.Provider value={value}>
            {children}
        </RewardsContext.Provider>
    );
};
