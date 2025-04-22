import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import RewardEditor from './RewardCardEditModal';
import { useRewards, useUpdateReward } from '@/data/RewardDataHandler';

interface RewardCardProps {
  id: number;
}

const RewardCard: React.FC<RewardCardProps> = ({ id }) => {
  const { data: rewards, isLoading, isError } = useRewards();
  const { mutate: updateReward } = useUpdateReward();
  const reward = rewards?.find((reward) => reward.id === id);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError || !reward) {
    return <p>Error or Reward not found</p>;
  }

  const handleSave = async (rewardData: any) => {
    await updateReward({ id: reward.id, ...rewardData });
    setIsEditDialogOpen(false);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-[#00f0ff]">
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <h2>{reward.title}</h2>
        <p>{reward.description}</p>
        <Button onClick={() => setIsEditDialogOpen(true)}>Edit</Button>
      </div>
      <RewardEditor
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        rewardData={reward}
        onSave={handleSave}
        onDelete={(rewardId: number) => {
          // Implement delete logic here
          console.log('Reward deleted:', rewardId);
          setIsEditDialogOpen(false);
        }}
      />
    </Card>
  );
};

export default RewardCard;