
import React, { createContext, useContext } from 'react';
import { Reward } from '@/lib/rewardUtils';

interface RewardFormContextType {
  reward: Reward;
  globalCarouselTimer: NodeJS.Timeout | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: number) => Promise<boolean>;
  rewardIndex: number;
}

export const RewardFormContext = createContext<RewardFormContextType | null>(null);

export const useRewardForm = () => {
  const context = useContext(RewardFormContext);
  if (!context) {
    throw new Error('useRewardForm must be used within a RewardFormProvider');
  }
  return context;
};

interface RewardFormProviderProps {
  children: React.ReactNode;
  reward: Reward;
  globalCarouselTimer: NodeJS.Timeout | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: number) => Promise<boolean>;
  rewardIndex: number;
}

const RewardFormProvider: React.FC<RewardFormProviderProps> = ({ 
  children, 
  reward, 
  globalCarouselTimer,
  onSave,
  onCancel,
  onDelete,
  rewardIndex
}) => {
  return (
    <RewardFormContext.Provider value={{ 
      reward, 
      globalCarouselTimer,
      onSave,
      onCancel,
      onDelete,
      rewardIndex
    }}>
      {children}
    </RewardFormContext.Provider>
  );
};

export default RewardFormProvider;
