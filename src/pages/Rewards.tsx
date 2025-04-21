import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Create a new QueryClient instance
const queryClient = new QueryClient();

//Implement LocalStorage persistence
const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
})

persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 20 // Persisted data valid for 20 minutes
});

interface RewardsContentProps {
    isEditorOpen: boolean;
    setIsEditorOpen: (isOpen: boolean) => void;
}

const RewardsContent: React.FC<RewardsContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
    const [currentReward, setCurrentReward] = useState<any>(null);
    const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // Fetch rewards using React Query
    const { data: rewards = [], isLoading, error, refetch } = useQuery({
        queryKey: ['rewards'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rewards')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
        staleTime: 1000 * 60 * 20,
        cacheTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
    });

    // Mutations for saving, deleting, and claiming rewards
    const saveRewardMutation = useMutation(
        async (rewardData: any) => {
            const { data, error } = await supabase
                .from('rewards')
                .upsert(rewardData)
                .select()
                .single();
            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
        {
            onMutate: async (newReward) => {
                // Cancel any outgoing rewards queries, so they don't overwrite the optimistic update
                await queryClient.cancelQueries({ queryKey: ['rewards'] });

                // Snapshot the previous value
                const previousRewards = queryClient.getQueryData<any[]>(['rewards']) || [];

                // Optimistically update the cache
                queryClient.setQueryData<any[]>(['rewards'], (old) => {
                    if (newReward.id) {
                        // If the reward exists, update it
                        return old?.map((reward) => (reward.id === newReward.id ? newReward : reward)) ?? [];
                    } else {
                        // If the reward is new, add it to the beginning of the list
                        return [newReward, ...(old ?? [])];
                    }
                });

                // Return a context object with the snapshotted value
                return { previousRewards };
            },
            onError: (err, newReward, context: any) => {
                console.error('Error saving reward:', err);
                toast({
                    title: 'Error',
                    description: 'Failed to save reward. Please try again.',
                    variant: 'destructive',
                });
                // Rollback to the previous value
                queryClient.setQueryData<any[]>(['rewards'], context.previousRewards);
            },
            onSettled: () => {
                // After success or failure, refetch rewards to ensure accuracy
                queryClient.invalidateQueries({ queryKey: ['rewards'] });
            },
        }
    );

    const deleteRewardMutation = useMutation(
        async (rewardId: string) => {
            const { data, error } = await supabase
                .from('rewards')
                .delete()
                .eq('id', rewardId)
                .select()
                .single();
            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
        {
            onMutate: async (rewardId) => {
                // Cancel any outgoing rewards queries, so they don't overwrite the optimistic update
                await queryClient.cancelQueries({ queryKey: ['rewards'] });

                // Snapshot the previous value
                const previousRewards = queryClient.getQueryData<any[]>(['rewards']) || [];

                // Optimistically update the cache
                queryClient.setQueryData<any[]>(['rewards'], (old) =>
                    old?.filter((reward) => reward.id !== rewardId) ?? []
                );

                // Return a context object with the snapshotted value
                return { previousRewards };
            },
            onError: (err, rewardId, context: any) => {
                console.error('Error deleting reward:', err);
                toast({
                    title: 'Error',
                    description: 'Failed to delete reward. Please try again.',
                    variant: 'destructive',
                });
                // Rollback to the previous value
                queryClient.setQueryData<any[]>(['rewards'], context.previousRewards);
            },
            onSettled: () => {
                // After success or failure, refetch rewards to ensure accuracy
                queryClient.invalidateQueries({ queryKey: ['rewards'] });
            },
        }
    );

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
            // Optimistically update the cache
            await saveRewardMutation.mutateAsync(rewardData);

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
    const handleDelete = async (rewardId: string) => {
        console.log("Deleting reward with id:", rewardId);
        try {
            // Optimistically update the cache
            await deleteRewardMutation.mutateAsync(rewardId);

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
            <RewardsList onEdit={handleEdit} onDelete={handleDelete} />

            <RewardEditor
                isOpen={isEditorOpen}
                onClose={closeEditor}
                rewardData={currentReward}
                onSave={handleSave}
            />
        </div>
    );
};

const Rewards: React.FC = () => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    return (
        <AppLayout onAddNewItem={() => setIsEditorOpen(true)}>
            <QueryClientProvider client={queryClient}>
                <RewardsContent
                    isEditorOpen={isEditorOpen}
                    setIsEditorOpen={setIsEditorOpen}
                />
            </QueryClientProvider>
        </AppLayout>
    );
};

export default Rewards;
