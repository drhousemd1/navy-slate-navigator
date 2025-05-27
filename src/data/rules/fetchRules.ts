
import { supabase } from '@/integrations/supabase/client';
import { Rule, RawSupabaseRule } from './types'; // Rule is already imported here
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

// Ensure parseRuleData correctly transforms RawSupabaseRule to Rule
export const parseRuleData = (rawRule: RawSupabaseRule): Rule => {
  return {
    id: rawRule.id,
    created_at: rawRule.created_at,
    updated_at: rawRule.updated_at,
    title: rawRule.title,
    description: rawRule.description ?? null,
    category: rawRule.category || 'general', // Default if null
    points_impact: rawRule.points_impact || 0, // Default if null
    // Add any other transformations or default values needed
  };
};

export const fetchRules = async (userId?: string): Promise<Rule[]> => {
  try {
    let query = supabase.from('rules').select('*').order('created_at', { ascending: false });
    // if (userId) { // If rules are user-specific
    //   query = query.eq('user_id', userId);
    // }
    const { data, error } = await query;
    if (error) throw error;
    // Ensure data is not null before mapping, and parse each item
    return data ? data.map(parseRuleData) : [];
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    logger.error(`Error fetching rules${userId ? ` for user ${userId}` : ''}:`, message, e);
    throw new Error(`Failed to fetch rules: ${message}`);
  }
};

export const fetchRuleById = async (id: string): Promise<Rule | null> => {
  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw error;
    }
    return data ? parseRuleData(data) : null;
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    logger.error(`Error fetching rule by ID ${id}:`, message, e);
    throw new Error(`Failed to fetch rule ${id}: ${message}`);
  }
};

