import React from 'react';
import { Card } from '@/components/ui/card';
import RewardHeader from '@/components/ui/RewardHeader';
import RewardContent from '@/components/ui/RewardContent';
import RewardFooter from '@/components/ui/RewardFooter';
import { toast } from '@/hooks/use-toast';

interface RewardCardProps {
  id: string;
  title: string;
  description: string;
  cost: number;
  imageUrl?: string;
  onPurchase: (rewardId: string, cost: number) => Promise<void>;
}

const RewardCard: React.FC<RewardCardProps> = ({
  id,
  title,
  description,
  cost,
  imageUrl,
  onPurchase,
}) => {
  const handlePurchaseClick = async () => {
    try {
      await onPurchase(id, cost);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast({
        title: "Error",
        description: "Failed to purchase reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-navy border-2 border-[#00f0ff] text-white relative">
      <RewardHeader cost={cost} />
      <RewardContent title={title} description={description} imageUrl={imageUrl} />
      <RewardFooter onPurchase={handlePurchaseClick} />
    </Card>
  );
};

export default RewardCard;
