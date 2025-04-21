
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import RewardEditor from '../RewardEditor';
import RewardHeader from './RewardHeader';
import RewardContent from './RewardContent';
import RewardFooter from './RewardFooter';
import RewardBackground from './RewardBackground';
import { usePointsManagement } from '@/contexts/rewards/usePointsManagement';
import { useToast } from '@/hooks/use-toast';
import { useRewardOperations } from '@/contexts/rewards/useRewardOperations';
import { getMondayBasedDay } from '@/lib/utils';
// Removed unused import dayjs due to missing package

interface RewardCardProps {
  title: string;
  description: string;
  points: number;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  id?: string;
}

const useRewardCard = ({ id, points }: { id?: string; points: number }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { totalPoints, setTotalPoints, updatePointsInDatabase } = usePointsManagement();
  const { toast } = useToast();
  const {
    rewards,
    handleSaveReward,
    handleDeleteReward,
    handleUseReward: contextHandleUseReward,
  } = useRewardOperations();

  const [weekData, setWeekData] = useState<boolean[]>(Array(7).fill(false));

  useEffect(() => {
    setWeekData(Array(7).fill(false));
  }, []);

  const handleUseReward = useCallback(async () => {
    if (!id) return;
    try {
      const reward = rewards.find(r => r.id === id);
      if (!reward) {
        toast({
          variant: 'destructive',
          title: 'Reward Not Found',
          description: 'Could not find the reward to use.',
        });
        return;
      }
      if (reward.supply <= 0) {
        toast({
          variant: 'destructive',
          title: 'No Supply',
          description: "You don't have any supply of this reward.",
        });
        return;
      }

      // Use context's handleUseReward to handle supply and usage recording
      await contextHandleUseReward(id);

      // Update local week data (simulate marking today as used)
      const todayIndex = getMondayBasedDay();
      setWeekData(prev => {
        const newData = [...prev];
        newData[todayIndex] = true;
        return newData;
      });

      toast({
        title: 'Reward Used',
        description: 'You have used this reward!',
      });
    } catch (error) {
      console.error('Error using reward:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not use reward.',
      });
    }
  }, [id, toast, contextHandleUseReward]);

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSaveRewardWrapper = async (data: any) => {
    if (!id) return;
    try {
      await handleSaveReward(data, null);
      setIsEditorOpen(false);
      toast({
        title: 'Reward Saved',
        description: 'Reward has been updated.',
      });
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save reward.',
      });
    }
  };

  const handleDeleteRewardWrapper = async () => {
    if (!id) return;
    try {
      // Find reward index to delete
      const index = rewards.findIndex(r => r.id === id);
      if (index === -1) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Reward not found to delete.',
        });
        return;
      }
      await handleDeleteReward(index);
      toast({
        title: 'Reward Deleted',
        description: 'Reward has been deleted.',
      });
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete reward.',
      });
    }
  };

  return {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    handleUseReward,
    handleEdit,
    handleSaveReward: handleSaveRewardWrapper,
    handleDeleteReward: handleDeleteRewardWrapper,
  };
};

const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  points,
  icon_name = 'Gift',
  icon_color = '#9b87f5',
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB',
  highlight_effect = false,
  background_image_url,
  background_opacity = 100,
  focal_point_x = 50,
  focal_point_y = 50,
  id,
}) => {
  const {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    handleUseReward,
    handleEdit,
    handleSaveReward,
    handleDeleteReward
  } = useRewardCard({ id, points });

  return (
    <>
      <Card 
        className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy z-0"
        style={
          points > 0
            ? {
                borderColor: '#FEF7CD',
                boxShadow: '0 0 8px 2px rgba(254, 247, 205, 0.6)',
              } 
            : {}
        }
      >
        {background_image_url && (
          <div 
            className="absolute inset-0 z-0" 
            style={{
              backgroundImage: `url(${background_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
              opacity: background_opacity / 100,
            }}
          />
        )}
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <RewardHeader
            title={title}
            supply={points}
            cost={points}
            onBuy={() => {}}
            onUse={handleUseReward}
          />

          <RewardContent
            iconName={icon_name}
            iconColor={icon_color}
            title={title}
            description={description}
            highlight_effect={highlight_effect}
            title_color={title_color}
            subtext_color={subtext_color}
          />

          <RewardFooter
            usageData={weekData}
            calendarColor={calendar_color}
            onEdit={handleEdit}
          />
        </div>
      </Card>

      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        rewardData={{
          id,
          title,
          description,
          points,
          icon_name,
          icon_color,
          title_color,
          subtext_color,
          calendar_color,
          highlight_effect,
          background_image_url,
          background_opacity,
          focal_point_x,
          focal_point_y
        }}
        onSave={handleSaveReward}
        onDelete={handleDeleteReward}
      />
    </>
  );
};

export default RewardCard;
