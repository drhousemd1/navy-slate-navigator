import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { PunishmentData, PunishmentsContextType } from './types';

// Function to fetch punishments from the database
const fetchPunishments = async (): Promise<PunishmentData[]> => {
    const { data, error } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching punishments:', error);
        throw error;
    }

    return data as PunishmentData[];
};

// Function to create a punishment in the database
const createPunishment = async (punishment: PunishmentData): Promise<PunishmentData> => {
    const { data, error } = await supabase
        .from('punishments')
        .insert([punishment])
        .select()
        .single();

    if (error) {
        console.error('Error creating punishment:', error);
        throw error;
    }

    return data as PunishmentData;
};

// Function to update a punishment in the database
const updatePunishment = async (punishmentId: string, updates: Partial<PunishmentData>): Promise<PunishmentData> => {
    const { data, error } = await supabase
        .from('punishments')
        .update(updates)
        .eq('id', punishmentId)
        .select()
        .single();

    if (error) {
        console.error('Error updating punishment:', error);
        throw error;
    }

    return data as PunishmentData;
};

// Function to delete a punishment from the database
const deletePunishment = async (punishmentId: string): Promise<void> => {
    const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', punishmentId);

    if (error) {
        console.error('Error deleting punishment:', error);
        throw error;
    }
};

export const usePunishmentOperations = (): Omit<PunishmentsContextType, 'globalCarouselTimer' | 'setGlobalCarouselTimer'> => {
    const queryClient = useQueryClient();

    // Fetch punishments using React Query
    const { data: punishments = [], isLoading, error, refetch } = useQuery({
        queryKey: ['punishments'],
        queryFn: fetchPunishments,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // Mutations for creating, updating, and deleting punishments
    const createPunishmentMutation = useMutation({
        mutationFn: createPunishment,
        onSuccess: () => {
            // Invalidate the punishments query to refetch the data
            queryClient.invalidateQueries(['punishments']);
            toast({
                title: 'Success',
                description: 'Punishment created successfully!',
            });
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to create punishment. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const updatePunishmentMutation = useMutation({
        mutationFn: ({ punishmentId, updates }: { punishmentId: string; updates: Partial<PunishmentData> }) =>
            updatePunishment(punishmentId, updates),
        onSuccess: () => {
            // Invalidate the punishments query to refetch the data
            queryClient.invalidateQueries(['punishments']);
            toast({
                title: 'Success',
                description: 'Punishment updated successfully!',
            });
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to update punishment. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const deletePunishmentMutation = useMutation({
        mutationFn: deletePunishment,
        onSuccess: () => {
            // Invalidate the punishments query to refetch the data
            queryClient.invalidateQueries(['punishments']);
            toast({
                title: 'Success',
                description: 'Punishment deleted successfully!',
            });
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to delete punishment. Please try again.',
                variant: 'destructive',
            });
        },
    });

    // Handlers for creating, updating, and deleting punishments
    const handleCreatePunishment = async (punishment: PunishmentData) => {
        createPunishmentMutation.mutate(punishment);
    };

    const handleUpdatePunishment = async (punishmentId: string, updates: Partial<PunishmentData>) => {
        updatePunishmentMutation.mutate({ punishmentId, updates });
    };

    const handleDeletePunishment = async (punishmentId: string) => {
        deletePunishmentMutation.mutate(punishmentId);
    };

    return {
        punishments,
        loading: isLoading,
        createPunishment: handleCreatePunishment,
        updatePunishment: handleUpdatePunishment,
        deletePunishment: handleDeletePunishment,
        refetchPunishments: refetch,
    };
};
