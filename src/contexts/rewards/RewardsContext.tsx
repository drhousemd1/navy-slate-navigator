
import React, { createContext, useContext, useState } from 'react';
import { Reward } from '@/data/rewards/types';

interface RewardsContextType {
  rewards: Reward[];
  setRewards: (rewards: Reward[]) => void;
}

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  setRewards: () => {},
});

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);

  return (
    <RewardsContext.Provider value={{ rewards, setRewards }}>
      {children}
    </RewardsContext.Provider>
  );
};

export { RewardsContext };
export const useRewardsContext = () => useContext(RewardsContext);
