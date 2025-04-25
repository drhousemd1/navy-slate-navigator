
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from './queries';

export const createPunishmentMutation = (queryClient: QueryClient) => ({
  mutationFn: async (newPunishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => {
    const { data, error } = await supabase
      .from('punishments')
      .insert(newPunishment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onMutate: async (newPunishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => {
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousData = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
    
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, [
      {
        ...newPunishment,
        id: 'temp-' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ...(previousData || [])
    ]);
    
    return { previousData };
  },
  onError: (err: Error, _: unknown, context: { previousData: PunishmentData[] } | undefined) => {
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousData);
    toast({
      title: "Error",
      description: "Failed to create punishment",
      variant: "destructive",
    });
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Punishment created successfully",
    });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
  }
});

export const updatePunishmentMutation = (queryClient: QueryClient) => ({
  mutationFn: async ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => {
    const { data, error } = await supabase
      .from('punishments')
      .update(punishment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onMutate: async ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => {
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousData = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
    
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: PunishmentData[] | undefined) =>
      (old || []).map(p =>
        p.id === id ? { ...p, ...punishment, updated_at: new Date().toISOString() } : p
      )
    );
    
    return { previousData };
  },
  onError: (err: Error, _: unknown, context: { previousData: PunishmentData[] } | undefined) => {
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousData);
    toast({
      title: "Error",
      description: "Failed to update punishment",
      variant: "destructive",
    });
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Punishment updated successfully",
    });
  }
});

export const applyPunishmentMutation = (queryClient: QueryClient) => ({
  mutationFn: async (punishment: { id: string; points: number }) => {
    const historyEntry = {
      punishment_id: punishment.id,
      points_deducted: punishment.points,
      day_of_week: new Date().getDay()
    };

    const { data, error } = await supabase
      .from('punishment_history')
      .insert(historyEntry)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onMutate: async (punishment: { id: string; points: number }) => {
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousData = queryClient.getQueryData(PUNISHMENT_HISTORY_QUERY_KEY);
    
    const newHistoryEntry = {
      id: 'temp-' + Date.now(),
      punishment_id: punishment.id,
      points_deducted: punishment.points,
      day_of_week: new Date().getDay(),
      applied_date: new Date().toISOString()
    };

    queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, [
      newHistoryEntry,
      ...(previousData || [])
    ]);
    
    return { previousData };
  },
  onError: (err: Error, _: unknown, context: { previousData: PunishmentHistoryItem[] } | undefined) => {
    queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context?.previousData);
    toast({
      title: "Error",
      description: "Failed to apply punishment",
      variant: "destructive",
    });
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Punishment applied successfully",
    });
    queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
  }
});

export const deletePunishmentMutation = (queryClient: QueryClient) => ({
  mutationFn: async (id: string) => {
    const { error } = await supabase
      .from('punishments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
  onMutate: async (id: string) => {
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY }),
      queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    
    const previousPunishments = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
    const previousHistory = queryClient.getQueryData(PUNISHMENT_HISTORY_QUERY_KEY);
    
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, 
      (old: PunishmentData[] | undefined) => (old || []).filter(p => p.id !== id)
    );
    
    queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY,
      (old: PunishmentHistoryItem[] | undefined) => (old || []).filter(h => h.punishment_id !== id)
    );
    
    return { previousPunishments, previousHistory };
  },
  onError: (err: Error, _: unknown, context: { previousPunishments: PunishmentData[], previousHistory: PunishmentHistoryItem[] } | undefined) => {
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousPunishments);
    queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context?.previousHistory);
    toast({
      title: "Error",
      description: "Failed to delete punishment",
      variant: "destructive",
    });
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Punishment deleted successfully",
    });
  }
});

