
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Link2 } from 'lucide-react';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { useWellbeingQuery } from '@/data/wellbeing/queries';
import MoodHealthBar from './wellbeing/MoodHealthBar';
import WellbeingPopover from './wellbeing/WellbeingPopover';
import AvatarPreviewPopover from './AvatarPreviewPopover';
import { logger } from '@/lib/logger';

const PartnerDisplay: React.FC = () => {
  const { data: partnerProfile } = usePartnerProfile();
  const partnerWellbeingQuery = useWellbeingQuery(partnerProfile?.id || null);

  if (!partnerProfile) {
    return null;
  }

  // Use the actual nickname from the partner's profile, fallback to "Partner" if not set
  const partnerNickname = partnerProfile.nickname || "Partner";
  const partnerWellbeingScore = partnerWellbeingQuery.data?.overall_score || 50; // Default to neutral if no data

  return (
    <div className="flex items-center">
      {/* Link icon */}
      <Link2 className="w-4 h-4 text-gray-400 mr-2" />
      
      {/* Partner's wellbeing health bar - positioned to the left of avatar */}
      <WellbeingPopover
        wellbeingData={partnerWellbeingQuery.data}
        partnerNickname={partnerNickname}
        isLoading={partnerWellbeingQuery.isLoading}
      >
        <MoodHealthBar 
          score={partnerWellbeingScore}
          className="mr-2"
        />
      </WellbeingPopover>
      
      {/* Avatar */}
      <AvatarPreviewPopover
        avatarUrl={partnerProfile.avatar_url}
        nickname={partnerNickname}
        fallbackLetter={partnerNickname ? partnerNickname.charAt(0).toUpperCase() : 'P'}
      >
        <Avatar className="h-7 w-7 cursor-pointer">
          {partnerProfile.avatar_url ? (
            <AvatarImage 
              src={partnerProfile.avatar_url} 
              alt={`${partnerNickname} Avatar`}
              onError={(e) => {
                logger.error('Failed to load partner avatar image:', partnerProfile.avatar_url);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <AvatarFallback className="bg-light-navy text-nav-active text-xs">
            {partnerNickname ? partnerNickname.charAt(0).toUpperCase() : 'P'}
          </AvatarFallback>
        </Avatar>
      </AvatarPreviewPopover>
      
      {/* Partner name and role */}
      <div className="ml-2">
        <p className="text-white text-sm font-medium leading-tight break-words">{partnerNickname}</p>
        <p className="text-gray-400 text-xs leading-tight break-words">{partnerProfile.role}</p>
      </div>
    </div>
  );
};

export default PartnerDisplay;
