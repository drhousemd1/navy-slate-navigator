
import { supabase } from '@/services/api/supabase';
import { 
  Punishment, 
  CreatePunishmentInput, 
  UpdatePunishmentInput, 
  PunishmentApplication 
} from '@/types/punishment.types';

// Fetch all punishments for the current user
export const fetchPunishments = async (): Promise<Punishment[]> => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Create a new punishment
export const createPunishment = async (punishmentData: CreatePunishmentInput): Promise<Punishment> => {
  const { data, error } = await supabase
    .from('punishments')
    .insert([{ ...punishmentData, user_id: (await supabase.auth.getUser()).data.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Update an existing punishment
export const updatePunishment = async ({ id, ...updates }: UpdatePunishmentInput): Promise<Punishment> => {
  const { data, error } = await supabase
    .from('punishments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete a punishment
export const deletePunishment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('punishments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Apply a punishment and deduct points
export const applyPunishment = async (
  punishmentId: string, 
  pointsToDeduct: number
): Promise<PunishmentApplication> => {
  // Get current user
  const user = (await supabase.auth.getUser()).data.user;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single();
  
  if (profileError) throw profileError;
  
  // Update points - ensure points don't go below zero
  const newPoints = Math.max(0, profile.points - pointsToDeduct);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ points: newPoints })
    .eq('id', user.id);
  
  if (updateError) throw updateError;
  
  // Record punishment application
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  const { data, error } = await supabase
    .from('punishment_applications')
    .insert([{
      punishment_id: punishmentId,
      user_id: user.id,
      points_deducted: pointsToDeduct,
      day_of_week: dayOfWeek
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Get punishment applications history
export const getPunishmentHistory = async (): Promise<PunishmentApplication[]> => {
  const { data, error } = await supabase
    .from('punishment_applications')
    .select('*')
    .order('applied_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Upload a punishment image to Supabase Storage
export const uploadPunishmentImage = async (
  file: File,
  punishmentId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${punishmentId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('card_images')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('card_images')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};
