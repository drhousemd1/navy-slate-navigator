
import React from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, UserCircle, Shield, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle'; // Assuming this component exists
import { logger } from '@/lib/logger';

interface AccountSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const AccountSheet: React.FC<AccountSheetProps> = ({ isOpen, onOpenChange }) => {
  const { user, signOut, getNickname, getProfileImage, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false); // Close sheet on sign out
    navigate('/'); // Redirect to home or login page
  };

  const handleNavigateToProfile = () => {
    navigate('/profile');
    onOpenChange(false);
  };
  
  const handleNavigateToAdmin = () => {
    navigate('/admin');
    onOpenChange(false);
  };

  if (!user) {
    // Or simply don't render the sheet trigger if no user
    // This sheet content shouldn't be reachable if there's no user.
    return null; 
  }

  logger.log('AccountSheet: Current user email:', user.email);
  logger.log('AccountSheet: isAdmin from AuthContext:', isAdmin);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[300px] sm:w-[400px] bg-background text-foreground">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-semibold text-center">Account</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col items-center space-y-4 mb-8">
          <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={getProfileImage()} alt={getNickname()} />
            <AvatarFallback className="text-3xl bg-muted">
              {getNickname()?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-xl font-medium">{getNickname()}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="space-y-3">
          <Button variant="ghost" className="w-full justify-start text-lg py-6" onClick={handleNavigateToProfile}>
            <UserCircle className="mr-3 h-6 w-6 text-primary" />
            Profile
          </Button>

          {isAdmin && (
             <Button variant="ghost" className="w-full justify-start text-lg py-6" onClick={handleNavigateToAdmin}>
                <Shield className="mr-3 h-6 w-6 text-accent" /> 
                Admin Panel
             </Button>
          )}
          
          <div className="flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted/50">
            <div className="flex items-center">
              <Palette className="mr-3 h-6 w-6 text-primary" />
              <span className="text-lg">Theme</span>
            </div>
            <ThemeToggle />
          </div>

        </div>

        <SheetFooter className="mt-auto pt-6 border-t border-border">
          <SheetClose asChild>
            <Button variant="destructive" className="w-full text-lg py-6" onClick={handleSignOut}>
              <LogOut className="mr-3 h-6 w-6" />
              Sign Out
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
