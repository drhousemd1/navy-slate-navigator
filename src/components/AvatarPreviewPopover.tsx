import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarPreviewPopoverProps {
  children: React.ReactNode;
  avatarUrl?: string | null;
  nickname: string;
  fallbackLetter: string;
}

const AvatarPreviewPopover: React.FC<AvatarPreviewPopoverProps> = ({
  children,
  avatarUrl,
  nickname,
  fallbackLetter
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-32 h-32 bg-navy border-light-navy text-white z-[9999] shadow-lg p-2" side="bottom" align="center">
        <Avatar className="w-full h-full">
          {avatarUrl ? (
            <AvatarImage 
              src={avatarUrl} 
              alt={`${nickname} Avatar Preview`}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-light-navy text-nav-active text-4xl w-full h-full">
            {fallbackLetter}
          </AvatarFallback>
        </Avatar>
      </PopoverContent>
    </Popover>
  );
};

export default AvatarPreviewPopover;