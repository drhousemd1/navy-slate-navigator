import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { Reward, RawSupabaseReward, CreateRewardVariables } from '@/data/rewards/types';

export const parseRewardData = (rawReward: RawSupabaseReward): Reward => {
  return {
    id: rawReward.id,
    user_id: rawReward.user_id,
    title: rawReward.title,
    description: rawReward.description ?? undefined,
    cost: rawReward.cost,
    supply: rawReward.supply,
    icon_name: rawReward.icon_name ?? undefined,
    icon_url: rawReward.icon_url ?? undefined,
    icon_color: rawReward.icon_color || '#9b87f5',
    title_color: rawReward.title_color || '#FFFFFF',
    subtext_color: rawReward.subtext_color || '#8E9196',
    calendar_color: rawReward.calendar_color || '#7E69AB',
    background_image_url: rawReward.background_image_url ?? undefined,
    background_opacity: rawReward.background_opacity || 100,
    highlight_effect: rawReward.highlight_effect || false,
    focal_point_x: rawReward.focal_point_x || 50,
    focal_point_y: rawReward.focal_point_y || 50,
    is_dom_reward: rawReward.is_dom_reward ?? false,
    background_images: rawReward.background_images ?? null,
    created_at: rawReward.created_at,
    updated_at: rawReward.updated_at,
  };
};


const defaultRewards: CreateRewardVariables[] = [
  {
    title: "Movie Night",
    description: "Pick any movie for us to watch together.",
    cost: 50,
    supply: 0, // Unlimited
    icon_name: "Film", // Ensure this matches a Lucide icon name if used
    icon_color: "#FFD700",
    title_color: "#FFFFFF",
    subtext_color: "#B0B0B0",
    calendar_color: "#FF6B6B",
    background_opacity: 100,
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    is_dom_reward: false,
  },
  {
    title: "Dinner Date",
    description: "I'll cook your favorite meal.",
    cost: 75,
    supply: 0,
    icon_name: "Utensils",
    icon_color: "#3CB371",
    title_color: "#FFFFFF",
    subtext_color: "#B0B0B0",
    calendar_color: "#98FB98",
    background_opacity: 100,
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    is_dom_reward: false,
  },
  {
    title: "Foot Massage",
    description: "30-minute relaxing foot massage.",
    cost: 40,
    supply: 0,
    icon_name: "Foot",
    icon_color: "#CD853F",
    title_color: "#FFFFFF",
    subtext_color: "#B0B0B0",
    calendar_color: "#F4A460",
    background_opacity: 100,
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    is_dom_reward: false,
  },
  {
    title: "Control the TV",
    description: "You get to pick what we watch for the entire evening.",
    cost: 30,
    supply: 0,
    icon_name: "Tv",
    icon_color: "#8A2BE2",
    title_color: "#FFFFFF",
    subtext_color: "#B0B0B0",
    calendar_color: "#E6E6FA",
    background_opacity: 100,
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    is_dom_reward: true,
  },
  {
    title: "Skip a Chore",
    description: "Get out of one chore this week.",
    cost: 60,
    supply: 0,
    icon_name: "XOctagon",
    icon_color: "#FF4500",
    title_color: "#FFFFFF",
    subtext_color: "#B0B0B0",
    calendar_color: "#FA8072",
    background_opacity: 100,
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    is_dom_reward: true,
  },
];


export const usePreloadRewards = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      logger.debug('usePreloadRewards: No user ID provided, skipping preload.');
      return;
    }

    const fetchAndPreloadRewards = async () => {
      try {
        const { data: rewardsData, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          logger.error('Error fetching rewards:', fetchError.message);
          toast({
            title: 'Error fetching rewards',
            description: fetchError.message,
            variant: 'destructive',
          });
          return;
        }

        if (rewardsData && rewardsData.length === 0) {
          try {
            // Insert default rewards if none exist for the user
            const rewardsToInsert = defaultRewards.map(reward => ({ ...reward, user_id: userId }));
            const { error: insertError } = await supabase
              .from('rewards')
              .insert(rewardsToInsert);

            if (insertError) {
              logger.error('Error inserting default rewards:', insertError.message);
              toast({
                title: 'Error inserting default rewards',
                description: insertError.message,
                variant: 'destructive',
              });
              return;
            } else {
              logger.debug('Default rewards inserted successfully.');
            }
          } catch (insertError: unknown) {
            logger.error('Unexpected error inserting default rewards:', getErrorMessage(insertError), insertError);
            toast({
              title: 'Unexpected error inserting default rewards',
              description: getErrorMessage(insertError),
              variant: 'destructive',
            });
            return;
          }
        }

        // Preload rewards into the query cache
        const parsedRewards = (rewardsData || []).map(reward => parseRewardData(reward as RawSupabaseReward));
        queryClient.setQueryData(REWARDS_QUERY_KEY, parsedRewards);
        logger.debug('Rewards preloaded successfully.');

      } catch (error: unknown) {
        logger.error('Unexpected error in usePreloadRewards:', getErrorMessage(error), error);
        toast({
          title: 'Unexpected error preloading rewards',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    };

    fetchAndPreloadRewards();
  }, [queryClient, userId]);
};
