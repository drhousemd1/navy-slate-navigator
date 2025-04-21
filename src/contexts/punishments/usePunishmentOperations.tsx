import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from './types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export const usePunishmentOperations = () => {
    const queryClient = useQueryClient();
    const [error, setError] = useState<Error | null>(null);

    const { data: punishments = [], isLoading, refetch } = useQuery({
        queryKey: ['punishments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('punishments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }
            return data as PunishmentData[];
        },
        onError: (err: any) => {
            setError(err);
        }
    });

    const createPunishmentMutation = useMutation({
        mutationFn: async (punishmentData: PunishmentData) => {
            const { data, error } = await supabase
                .from('punishments')
                .insert([punishmentData])
                .select()
                .single();

            if (error) {
                throw error;
            }
            return data as PunishmentData;
        },
        onMutate: async (newPunishment) => {
            await queryClient.cancelQueries({ queryKey: ['punishments'] });
            const previousPunishments = queryClient.getQueryData(['punishments']);

            queryClient.setQueryData<PunishmentData[]>(['punishments'], (old) => {
                return old ? [newPunishment, ...old] : [newPunishment];
            });

            return { previousPunishments };
        },
        onError: (err: any, newPunishment, context: any) => {
            console.error('Error creating punishment:', err);
            setError(err);
            queryClient.setQueryData(['punishments'], (context as any).previousPunishments);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['punishments'] });
        },
    });

    const updatePunishmentMutation = useMutation({
        mutationFn: async ({ id, punishmentData }: { id: string, punishmentData: PunishmentData }) => {
            const { data, error } = await supabase
                .from('punishments')
                .update(punishmentData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }
            return data as PunishmentData;
        },
        onMutate: async ({ id, punishmentData }) => {
            await queryClient.cancelQueries({ queryKey: ['punishments'] });
            const previousPunishments = queryClient.getQueryData(['punishments']);

            queryClient.setQueryData<PunishmentData[]>(['punishments'], (old) =>
                old?.map((punishment) => (punishment.id === id ? { ...punishment, ...punishmentData } : punishment))
            );

            return { previousPunishments };
        },
        onError: (err: any, { id, punishmentData }, context: any) => {
            console.error('Error updating punishment:', err);
            setError(err);
            queryClient.setQueryData(['punishments'], (context as any).previousPunishments);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['punishments'] });
        },
    });

    const deletePunishmentMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('punishments')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['punishments'] });
            const previousPunishments = queryClient.getQueryData(['punishments']);

            queryClient.setQueryData<PunishmentData[]>(['punishments'], (old) =>
                old?.filter((punishment) => punishment.id !== id)
            );

            return { previousPunishments };
        },
        onError: (err: any, id, context: any) => {
            console.error('Error deleting punishment:', err);
            setError(err);
            queryClient.setQueryData(['punishments'], (context as any).previousPunishments);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['punishments'] });
        },
    });

    const applyPunishment = async (punishmentId: string, points: number) => {
        // Placeholder for applyPunishment logic
        // This function would ideally update user points or log the punishment
        console.log(`Applying punishment ${punishmentId} with ${points} points`);
    };

    const createPunishment = async (punishmentData: PunishmentData) => {
        return createPunishmentMutation.mutateAsync(punishmentData);
    };

    const updatePunishment = async (id: string, punishmentData: PunishmentData) => {
        return updatePunishmentMutation.mutateAsync({ id, punishmentData });
    };

    const deletePunishment = async (id: string) => {
        return deletePunishmentMutation.mutateAsync(id);
    };

    const fetchPunishments = async () => {
        // Trigger refetch manually
        refetch();
    };

    const getPunishmentHistory = (punishmentId: string) => {
        // Placeholder for getPunishmentHistory logic
        console.log(`Getting history for punishment ${punishmentId}`);
        return [];
    };

    const totalPointsDeducted = 0;

    return {
        punishments,
        punishmentHistory: [],
        loading: isLoading,
        error,
        fetchPunishments,
        createPunishment,
        updatePunishment,
        deletePunishment,
        applyPunishment,
        getPunishmentHistory,
        totalPointsDeducted,
    };
};
