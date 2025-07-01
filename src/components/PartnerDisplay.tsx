
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Link2 } from 'lucide-react';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { logger } from '@/lib/logger';

const PartnerDisplay: React.FC = () => {
  const { data: partnerProfile } = usePartnerProfile();

  if (!partnerProfile) {
    return null;
  }

  // Get partner's nickname from email (similar to how it's done for the main user)
  const getPartnerNickname = () => {
    // For now, we'll use "Partner" as the display name since we don't have email in the profile
    // This can be enhanced later when we add a nickname field to profiles
    return "Partner";
  };

  const partnerNickname = getPartnerNickname();

  return (
    <div className="flex items-center gap-2">
      {/* Link icon */}
      <Link2 className="w-4 h-4 text-gray-400" />
      
      {/* Partner info */}
      <div className="flex items-center">
        <Avatar 
          className="h-7 w-7" 
        >
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
        
        {/* Partner name and role */}
        <div className="ml-2">
          <p className="text-white text-sm font-medium leading-tight break-words">{partnerNickname}</p>
          <p className="text-gray-400 text-xs leading-tight break-words">{partnerProfile.role}</p>
        </div>
      </div>
    </div>
  );
};

export default PartnerDisplay;
