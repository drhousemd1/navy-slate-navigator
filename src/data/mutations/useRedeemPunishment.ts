
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../queryClient";
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from "@/contexts/punishments/types";
import { savePunishmentHistoryToDB, savePointsToDB, saveDomPointsToDB } from "../indexeddb/useIndexedDB";

// Interface for redeeming a punishment
interface RedeemPunishmentParams {
  punishmentId: string;
  pointsToDeduct: number;
  isDomPunishment?: boolean;
}

// Function to redeem a punishment
const redeemPunishment = async (
  { punishmentId, pointsToDeduct, isDomPunishment = false }: RedeemPunishmentParams
): Promise<PunishmentHistoryItem> => {
  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  // Get current points
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('points, dom_points')
    .eq('id', userData.user.id)
    .single();
    
  if (profileError) throw profileError;
  
  // Calculate new points value
  const pointsField = isDomPunishment ? 'dom_points' : 'points';
  const currentPoints = isDomPunishment ? (profileData?.dom_points || 0) : (profileData?.points || 0);
  const newPoints = Math.max(0, currentPoints - pointsToDeduct);
  
  // Update user points
  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ [pointsField]: newPoints })
    .eq('id', userData.user.id);
    
  if (pointsError) throw pointsError;
  
  // Record the punishment in history
  const historyEntry = {
    punishment_id: punishmentId,
    points_deducted: pointsToDeduct,
    applied_date: new Date().toISOString(),
    day_of_week: new Date().getDay()
  };
  
  const { data: historyData, error: historyError } = await supabase
    .from('punishment_history')
    .insert(historyEntry)
    .select()
    .single();
    
  if (historyError) throw historyError;
  
  // Update points in cache
  if (isDomPunishment) {
    queryClient.setQueryData(['dom_points'], newPoints);
    await saveDomPointsToDB(newPoints);
  } else {
    queryClient.setQueryData(['points'], newPoints);
    await savePointsToDB(newPoints);
  }
  
  return historyData as PunishmentHistoryItem;
};

// Hook for redeeming punishments
export function useRedeemPunishment() {
  return useMutation({
    mutationFn: redeemPunishment,
    onSuccess: (historyEntry) => {
      // Update punishment history in cache
      queryClient.setQueryData(['punishment_history'], (oldHistory: PunishmentHistoryItem[] = []) => {
        const updatedHistory = [historyEntry, ...oldHistory];
        
        // Update IndexedDB
        savePunishmentHistoryToDB(updatedHistory);
        
        return updatedHistory;
      });
    }
  });
}
