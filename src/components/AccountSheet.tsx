
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { UserCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AccountSheet = () => {
  const { user } = useAuth();
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <UserCircle2 className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[75vw] bg-navy border-r border-light-navy text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Account</SheetTitle>
        </SheetHeader>
        
        <div className="py-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-12 w-12 border border-light-navy">
              <AvatarImage src="" alt="User avatar" />
              <AvatarFallback className="bg-light-navy text-nav-active">
                {user ? user.email?.charAt(0).toUpperCase() : 'G'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">
                {user ? user.email : 'Guest'}
              </p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            {/* Placeholder for future menu items */}
            <p className="text-sm text-gray-400">More options will be added here</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
