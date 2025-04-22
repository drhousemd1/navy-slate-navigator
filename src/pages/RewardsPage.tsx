import React from 'react';
import { useRewards, useCreateReward, useUpdateReward, useDeleteReward } from '@/data/RewardDataHandler';
import RewardCard from '@/components/RewardCard';

const RewardsPage: React.FC = () => {
  const { data: rewards, isLoading, isError } = useRewards();
  const { mutate: createReward } = useCreateReward();
  const { mutate: updateReward } = useUpdateReward();
  const { mutate: deleteReward } = useDeleteReward();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError) {
    return <p>Error loading rewards.</p>;
  }

  const handleCreateReward = () => {
    createReward({ title: 'New Reward', description: 'Description', cost: 10 });
  };

  return (
    <div>
      <h1>Rewards Page</h1>
      <button onClick={handleCreateReward}>Create Reward</button>
      {rewards?.map((reward) => (
        <RewardCard key={reward.id} id={reward.id || 0} />
      ))}
    </div>
  );
};

export default RewardsPage;