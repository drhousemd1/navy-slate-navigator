import React from 'react';
import { useWellbeingData } from '@/data/wellbeing';
import MoodHealthBar from '@/components/wellbeing/MoodHealthBar';
import WellbeingPopover from '@/components/wellbeing/WellbeingPopover';
import { useAuth } from '@/contexts/auth';

const UserHealthBar: React.FC = () => {
  const { user, getNickname } = useAuth();
  const { wellbeingSnapshot, getCurrentScore } = useWellbeingData();
  
  if (!user) {
    return null;
  }

  const currentScore = getCurrentScore();
  const nickname = getNickname() || 'You';

  return (
    <WellbeingPopover
      wellbeingData={wellbeingSnapshot}
      partnerNickname={nickname}
      isLoading={false}
    >
      <MoodHealthBar 
        score={currentScore}
        className="mr-2"
      />
    </WellbeingPopover>
  );
};

export default UserHealthBar;