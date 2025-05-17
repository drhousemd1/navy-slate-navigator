
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import RewardCard from '../RewardCard';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-3/4" /> {/* Title */}
      <Skeleton className="h-5 w-16" /> {/* Cost */}
    </div>
    <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
    <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-20" /> {/* Buy/Use Button */}
      <Skeleton className="h-8 w-20" /> {/* Edit Button */}
    </div>
  </div>
);

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuyReward, handleUseReward, isLoading } = useRewards();
  
  if (isLoading && (!rewards || rewards.length === 0)) { // Show skeletons if loading and no rewards yet
    return (
      <div className="space-y-4">
        <RewardCardSkeleton />
        <RewardCardSkeleton />
        <RewardCardSkeleton />
      </div>
    );
  }
  
  if (!isLoading && (!rewards || rewards.length === 0)) {
    return (
      <div className="text-center p-10">
        <p className="text-light-navy mb-4">You don't have any rewards yet.</p>
        <p className="text-light-navy">Click the + button to create your first reward!</p>
      </div>
    );
  }

  // Ensure rewards is not null before mapping
  if (!rewards) {
    return null; // Or some other fallback if rewards can be null after loading
  }

  // Enhanced debugging logs showing index and ID to track position stability
  console.log("[RewardsList] Rendering rewards list with stable order:", 
    rewards.map((r, i) => ({ 
      index: i, 
      id: r.id, 
      title: r.title, 
      is_dom_reward: r.is_dom_reward,
      created_at: r.created_at,
      updated_at: r.updated_at
    }))
  );

  return (
    <div className="flex flex-col gap-4">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id}
          title={reward.title}
          description={reward.description || ''}
          cost={reward.cost}
          supply={reward.supply}
          isDomReward={reward.is_dom_reward}
          iconName={reward.icon_name}
          iconColor={reward.icon_color}
          onBuy={() => handleBuyReward(reward.id, reward.cost)}
          onUse={() => handleUseReward(reward.id)}
          onEdit={() => onEdit(index)}
          backgroundImage={reward.background_image_url}
          backgroundOpacity={reward.background_opacity}
          focalPointX={reward.focal_point_x}
          focalPointY={reward.focal_point_y}
          highlight_effect={reward.highlight_effect}
          title_color={reward.title_color}
          subtext_color={reward.subtext_color}
          calendar_color={reward.calendar_color}
        />
      ))}
    </div>
  );
};

export default RewardsList;
