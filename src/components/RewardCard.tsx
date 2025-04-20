
import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import RewardHeader from './rewards/RewardHeader';
import RewardContent from './rewards/RewardContent';
import RewardFooter from './rewards/RewardFooter';
import { useToast } from '../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMondayBasedDay } from '@/lib/utils';

interface RewardCardProps {
  title: string;
  description: string;
  cost: number;
  supply: number;
  iconName?: string;
  iconColor?: string;
  onBuy?: (cost: number) => void;
  onUse?: () => void;
  onEdit?: () => void;
  backgroundImage?: string | null;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  usageData?: boolean[];
  frequencyCount?: number;
  id?: string;
}

const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  cost,
  supply,
  iconName = 'Gift',
  iconColor = '#9b87f5',
  onBuy,
  onUse,
  onEdit,
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB',
  usageData = Array(7).fill(false),
  id,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local usageData state to update usage immediately
  const [localUsageData, setLocalUsageData] = useState<boolean[]>([...usageData]);

  useEffect(() => {
    setLocalUsageData([...usageData]);
  }, [usageData]);

  // Handler that updates usage tracker on "Use" button click
  const handleUseReward = async () => {
    if (!id) {
      toast({
        title: "Error",
        description: "Reward ID missing. Cannot use reward.",
        variant: "destructive",
      });
      return;
    }

    if (supply <= 0) {
      toast({
        title: "No Supply",
        description: "You don't have any supply of this reward left to use.",
        variant: "destructive",
      });
      return;
    }

    // Compute today index based on Monday (0) through Sunday (6)
    const todayIndex = getMondayBasedDay();

    // Create updated usage data array to mark today as used
    const updatedUsage = [...localUsageData];
    updatedUsage[todayIndex] = true;
    setLocalUsageData(updatedUsage);

    // Call external onUse handler to update supply etc in DB and refetch
    if (onUse) {
      try {
        await onUse();
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to use reward",
          variant: "destructive",
        });

        // Revert local usageData for UI if error
        setLocalUsageData([...usageData]);
        return;
      }
    }

    // Insert new usage record in the DB
    try {
      const today = new Date();

      // Compute ISO week number string YYYY-Www following ISO standard
      // We use Monday as start of week already in getMondayBasedDay utility
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // shift Sunday (0) to Monday (1)
      weekStart.setDate(weekStart.getDate() + diff);

      const firstThursday = new Date(weekStart.getFullYear(), 0, 4);
      const firstThursdayDay = firstThursday.getDay();
      const firstWeekStart = new Date(firstThursday);
      const firstWeekDiff = (firstThursdayDay === 0 ? -6 : 1) - firstThursdayDay;
      firstWeekStart.setDate(firstWeekStart.getDate() + firstWeekDiff);

      // Calculate ISO week number
      const weekNumber = Math.round(((weekStart.getTime() - firstWeekStart.getTime()) / 86400000 + 3) / 7) + 1;
      const isoWeekNumber = `${weekStart.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

      const { error } = await supabase.from('reward_usage').insert({
        reward_id: id,
        day_of_week: todayIndex,
        week_number: isoWeekNumber,
        used: true,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to record reward usage",
        variant: "destructive",
      });
      // revert local state on error
      setLocalUsageData([...usageData]);
      return;
    }

    // Invalidate queries to get fresh data and update usageData refresh
    await queryClient.invalidateQueries({ queryKey: ['rewards'] });
  };

  const handleBuy = (cost: number) => {
    if (onBuy) {
      onBuy(cost);
    }
  };

  const handleEditReward = () => {
    if (onEdit) {
      onEdit();
    }
  };

  const cardBorderStyle =
    supply > 0
      ? {
          borderColor: '#FEF7CD',
          boxShadow: '0 0 8px 2px rgba(254, 247, 205, 0.6)',
        }
      : {};

  return (
    <Card
      className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy z-0"
      style={cardBorderStyle}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
          }}
        />
      )}
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <RewardHeader
          title={title}
          supply={supply}
          cost={cost}
          onBuy={handleBuy}
          onUse={handleUseReward}
        />

        <RewardContent
          title={title}
          description={description}
          iconName={iconName}
          iconColor={iconColor}
          highlight_effect={highlight_effect}
          title_color={title_color}
          subtext_color={subtext_color}
        />

        <RewardFooter
          usageData={localUsageData}
          calendarColor={calendar_color}
          onEdit={handleEditReward}
        />
      </div>
    </Card>
  );
};

export default RewardCard;
