
import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import RewardHeader from './rewards/RewardHeader';
import RewardContent from './rewards/RewardContent';
import RewardFooter from './rewards/RewardFooter';
import { useToast } from '../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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

  const [localUsageData, setLocalUsageData] = useState<boolean[]>(() => usageData.map(Boolean));

  useEffect(() => {
    setLocalUsageData(usageData.map(Boolean));
  }, [usageData]);

  const handleBuy = (cost: number) => {
    if (onBuy) {
      onBuy(cost);
    }
  };

  // Updated handleUseReward to properly update usage, update local state, and invalidate query
  const handleUseReward = async () => {
    if (!id) {
      toast({
        title: "Error",
        description: "Reward ID missing. Cannot use reward.",
        variant: "destructive",
      });
      return;
    }
    try {
      const todayIndex = getMondayBasedDay();
      const updatedUsage = [...localUsageData];
      updatedUsage[todayIndex] = true;

      if (onUse) {
        onUse();
      }

      const today = new Date();

      // Format week number as Year-ISOWeek (e.g., '2025-16')
      const oneJan = new Date(today.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((today.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = `${today.getFullYear()}-${Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7)}`;

      const { error } = await supabase
        .from('reward_usage')
        .insert({
          reward_id: id,
          day_of_week: todayIndex,
          week_number: weekNumber,
          used: true,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error inserting reward usage:", error);
        throw error;
      }

      setLocalUsageData(updatedUsage);
      // Invalidate the rewards query to refetch fresh data and update usageData prop
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });

      toast({
        title: "Success",
        description: `You used "${title}"`,
      });
    } catch (error) {
      console.error("Error using reward:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to use reward.",
        variant: "destructive",
      });
    }
  };

  const handleEditReward = () => {
    if (onEdit) {
      onEdit();
    }
  };

  const cardBorderStyle = supply > 0
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
