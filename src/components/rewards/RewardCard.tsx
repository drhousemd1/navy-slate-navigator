import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import RewardEditor from '../RewardEditor';
import { cn } from '@/lib/utils';
import RewardCardHeader from './RewardHeader';
import RewardContent from './RewardContent';
import RewardFooter from './RewardFooter';
import RewardBackground from './RewardBackground';
import { useToast } from '@/hooks/use-toast';
import { useRewardOperations } from '@/contexts/rewards/useRewardOperations';

interface RewardCardProps {
  title: string;
  description: string;
  points: number;
  icon?: React.ReactNode;
  id?: string;
  iconName?: string;
  iconColor?: string;
  titleColor?: string;
  subtextColor?: string;
  calendarColor?: string;
  highlightEffect?: boolean;
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
}

const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  points,
  id,
  iconName,
  iconColor = '#ea384c',
  titleColor = '#FFFFFF',
  subtextColor = '#8E9196',
  calendarColor = '#ea384c',
  highlightEffect = false,
  backgroundImageUrl,
  backgroundOpacity = 50,
  focalPointX = 50,
  focalPointY = 50,
}) => {
  // useRewardOperations provides proper update and delete
  const { updateReward, deleteReward } = useRewardOperations();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();

  const [weekData, setWeekData] = useState<boolean[]>([false, false, false, false, false, false, false]);

  useEffect(() => {
    // Initialize week data from db or default (simple placeholder)
    setWeekData([false, false, false, false, false, false, false]);
  }, []);

  const handleUseReward = useCallback(async () => {
    // Placeholder: implement spending points logic if needed
    try {
      // Would call some spendPoints here - not present directly in context
      toast({
        title: 'Reward Used',
        description: 'You have used this reward!',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not use reward.',
      });
    }
  }, [toast]);

  const handleClearWeekData = useCallback(async () => {
    setWeekData([false, false, false, false, false, false, false]);
  }, []);

  const handleEdit = () => setIsEditorOpen(true);

  const handleSaveReward = async (data: any) => {
    try {
      await updateReward(id!, data);
      setIsEditorOpen(false);
      toast({
        title: 'Reward Saved',
        description: 'Reward has been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save reward.',
      });
    }
  };

  const handleDeleteReward = async () => {
    try {
      await deleteReward(id!);
      toast({
        title: 'Reward Deleted',
        description: 'Reward has been deleted.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete reward.',
      });
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-blue-500 bg-navy">
        <RewardBackground
          background_image_url={backgroundImageUrl}
          background_opacity={backgroundOpacity}
          focal_point_x={focalPointX}
          focal_point_y={focalPointY}
        />
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <RewardCardHeader points={points} onUse={handleUseReward} />
          <RewardContent
            iconName={iconName}
            iconColor={iconColor}
            title={title}
            description={description}
            titleColor={titleColor}
            subtextColor={subtextColor}
            highlightEffect={highlightEffect}
          />
          <RewardFooter usageData={weekData} calendarColor={calendarColor} onClear={handleClearWeekData} onEdit={handleEdit} />
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
          iconName,
          iconColor,
          titleColor,
          subtextColor,
          calendarColor,
          highlightEffect,
          backgroundImageUrl,
          backgroundOpacity,
          focalPointX,
          focalPointY,
        }}
        onSave={handleSaveReward}
        onDelete={handleDeleteReward}
      />
    </>
  );
};

export default RewardCard;
