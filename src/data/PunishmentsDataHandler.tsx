
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchPunishments, 
  createPunishment, 
  updatePunishment, 
  deletePunishment, 
  applyPunishment,
  getPunishmentHistory,
  uploadPunishmentImage
} from '@/services/punishments';
import { 
  Punishment, 
  CreatePunishmentInput, 
  UpdatePunishmentInput, 
  PunishmentApplication 
} from '@/types/punishment.types';
import { toast } from '@/hooks/use-toast';
import { USER_POINTS_QUERY_KEY } from './RewardsDataHandler';

export const PUNISHMENTS_QUERY_KEY = 'punishments';
export const PUNISHMENT_HISTORY_QUERY_KEY = 'punishment-history';

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all punishments
  const { 
    data: punishments = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [PUNISHMENTS_QUERY_KEY],
    queryFn: fetchPunishments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for punishment history
  const {
    data: punishmentHistory = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: [PUNISHMENT_HISTORY_QUERY_KEY],
    queryFn: getPunishmentHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating a punishment
  const createPunishmentMutation = useMutation({
    mutationFn: (newPunishment: CreatePunishmentInput) => createPunishment(newPunishment),
    onSuccess: (newPunishment) => {
      queryClient.setQueryData(
        [PUNISHMENTS_QUERY_KEY],
        (oldData: Punishment[] = []) => [newPunishment, ...oldData]
      );
      
      toast({
        title: "Punishment created",
        description: "Your punishment has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create punishment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a punishment
  const updatePunishmentMutation = useMutation({
    mutationFn: (updatedPunishment: UpdatePunishmentInput) => updatePunishment(updatedPunishment),
    onMutate: async (updatedPunishment) => {
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
      
      const previousPunishments = queryClient.getQueryData<Punishment[]>([PUNISHMENTS_QUERY_KEY]);
      
      if (previousPunishments) {
        queryClient.setQueryData(
          [PUNISHMENTS_QUERY_KEY],
          previousPunishments.map(punishment => 
            punishment.id === updatedPunishment.id ? { ...punishment, ...updatedPunishment } : punishment
          )
        );
      }
      
      return { previousPunishments };
    },
    onSuccess: () => {
      toast({
        title: "Punishment updated",
        description: "Your punishment has been updated successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_QUERY_KEY], context.previousPunishments);
      }
      
      toast({
        title: "Failed to update punishment",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
    },
  });

  // Mutation for deleting a punishment
  const deletePunishmentMutation = useMutation({
    mutationFn: (punishmentId: string) => deletePunishment(punishmentId),
    onMutate: async (punishmentId) => {
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
      
      const previousPunishments = queryClient.getQueryData<Punishment[]>([PUNISHMENTS_QUERY_KEY]);
      
      if (previousPunishments) {
        queryClient.setQueryData(
          [PUNISHMENTS_QUERY_KEY],
          previousPunishments.filter(punishment => punishment.id !== punishmentId)
        );
      }
      
      return { previousPunishments };
    },
    onSuccess: () => {
      toast({
        title: "Punishment deleted",
        description: "Your punishment has been deleted successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_QUERY_KEY], context.previousPunishments);
      }
      
      toast({
        title: "Failed to delete punishment",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
    },
  });

  // Mutation for applying a punishment
  const applyPunishmentMutation = useMutation({
    mutationFn: ({ 
      punishmentId, 
      pointsToDeduct 
    }: { 
      punishmentId: string; 
      pointsToDeduct: number;
    }) => applyPunishment(punishmentId, pointsToDeduct),
    onMutate: async ({ punishmentId, pointsToDeduct }) => {
      await queryClient.cancelQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_POINTS_QUERY_KEY] });
      
      const previousHistory = queryClient.getQueryData<PunishmentApplication[]>([PUNISHMENT_HISTORY_QUERY_KEY]);
      const previousPoints = queryClient.getQueryData<number>([USER_POINTS_QUERY_KEY]);
      
      // Optimistically update points if we have them cached
      if (previousPoints !== undefined) {
        queryClient.setQueryData(
          [USER_POINTS_QUERY_KEY],
          Math.max(0, previousPoints - pointsToDeduct)
        );
      }
      
      return { previousHistory, previousPoints };
    },
    onSuccess: (_, { punishmentId }) => {
      const appliedPunishment = punishments.find(p => p.id === punishmentId);
      
      toast({
        title: "Punishment applied",
        description: appliedPunishment 
          ? `"${appliedPunishment.title}" has been applied.` 
          : "Your punishment has been applied successfully.",
        variant: "destructive",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData([PUNISHMENT_HISTORY_QUERY_KEY], context.previousHistory);
      }
      
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData([USER_POINTS_QUERY_KEY], context.previousPoints);
      }
      
      toast({
        title: "Failed to apply punishment",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY] });
    },
  });

  // Mutation for uploading a punishment image
  const uploadImageMutation = useMutation({
    mutationFn: ({ file, punishmentId }: { file: File; punishmentId: string }) => 
      uploadPunishmentImage(file, punishmentId),
    onSuccess: (imageUrl, { punishmentId }) => {
      // Update the punishment with the new image URL
      updatePunishmentMutation.mutate({ 
        id: punishmentId, 
        image_url: imageUrl 
      });
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    punishments,
    isLoading,
    error,
    punishmentHistory,
    isLoadingHistory,
    createPunishment: createPunishmentMutation.mutate,
    updatePunishment: updatePunishmentMutation.mutate,
    deletePunishment: deletePunishmentMutation.mutate,
    applyPunishment: applyPunishmentMutation.mutate,
    uploadPunishmentImage: uploadImageMutation.mutate,
    refetchHistory,
  };
};
