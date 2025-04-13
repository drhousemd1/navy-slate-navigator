
import React, { createContext } from 'react';
import { Reward } from '@/lib/rewardUtils';

export const RewardFormContext = createContext<any>(null);

interface Props {
  reward: Reward;
  globalCarouselTimer: NodeJS.Timeout | null;
  children: React.ReactNode;
}

export const RewardFormProvider: React.FC<Props> = ({ children, reward, globalCarouselTimer }) => {
  return (
    <RewardFormContext.Provider value={{ reward, globalCarouselTimer }}>
      {children}
    </RewardFormContext.Provider>
  );
};

export default RewardFormProvider;
