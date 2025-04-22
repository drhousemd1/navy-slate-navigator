
import React from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Edit, ShoppingCart } from 'lucide-react';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuyReward, totalPoints } = useRewards();

  if (!rewards || rewards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No Rewards Yet</h3>
        <p>Create your first reward to motivate yourself.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rewards.map((reward, index) => (
        <Card key={reward.id} className="bg-dark-navy border-2 border-[#00f0ff] overflow-hidden">
          <div className="relative p-4">
            {reward.background_image_url && (
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: `url(${reward.background_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `${reward.focal_point_x || 50}% ${reward.focal_point_y || 50}%`,
                  opacity: (reward.background_opacity || 100) / 100,
                }}
              />
            )}
            
            <div className="flex justify-between items-center mb-3 relative z-10">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center mr-3">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{reward.title}</h3>
                  {reward.description && (
                    <p className="text-sm text-gray-400">{reward.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-amber-500 text-white font-bold px-3 py-1 rounded">
                  {reward.cost} pts
                </div>
                <Button 
                  size="sm" 
                  className="bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 p-0"
                  onClick={() => onEdit(index)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  className="bg-amber-500 hover:bg-amber-600 rounded-full w-8 h-8 p-0"
                  onClick={() => handleBuyReward(index)}
                  disabled={totalPoints < reward.cost}
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default RewardsList;
