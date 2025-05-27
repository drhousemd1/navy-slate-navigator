
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth'; // Corrected import path
import { useUserIds } from '@/contexts/UserIdsContext'; // Corrected import path
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Added logger

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  partner_id: string | null;
}

const AccountSheet = ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) => {
  const { user, loading: authLoading, partnerId, setPartnerIdGlobally } = useAuth();
  const { partnerUserIds, isLoading: idsLoading } = useUserIds();
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(partnerId);
  const [availablePartners, setAvailablePartners] = useState<Profile[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [userData, setUserData] = useState<Profile | null>(null);

  useEffect(() => {
    setCurrentPartnerId(partnerId);
  }, [partnerId]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url, partner_id')
          .eq('id', user.id)
          .single();
        if (error) {
          logger.error('Error fetching user data:', error.message); // Replaced console.error
        } else if (data) {
          setUserData(data as Profile);
          logger.log('User data for account sheet:', data);
          if (data.partner_id && !partnerId) {
            setPartnerIdGlobally(data.partner_id);
            setCurrentPartnerId(data.partner_id);
          }
        }
      }
    };
    if (user?.id) {
      fetchUserData();
    }
  }, [user, partnerId, setPartnerIdGlobally]);
  
  useEffect(() => {
    logger.log('AccountSheet: User object from useAuth:', user ? { ...user, email: user.email ? '[EMAIL_REDACTED]' : undefined } : null);
    logger.log("Current partner ID:", currentPartnerId ? '[USER_ID]' : null);
  }, [user, currentPartnerId]);

  useEffect(() => {
    const fetchAvailablePartners = async () => {
      if (idsLoading || !partnerUserIds || partnerUserIds.length === 0) {
        setAvailablePartners([]);
        return;
      }
      setIsLoadingPartners(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', partnerUserIds);

      if (error) {
        logger.error('Error fetching available partners:', error.message); // Replaced console.error
        setAvailablePartners([]);
      } else {
        logger.log("Available partners:", data ? data.map(p => ({ ...p, id: '[USER_ID]' })) : []);
        setAvailablePartners(data || []);
      }
      setIsLoadingPartners(false);
    };

    fetchAvailablePartners();
  }, [partnerUserIds, idsLoading]);

  const handlePartnerChange = (newPartnerId: string) => {
    setCurrentPartnerId(newPartnerId);
  };

  const handleSavePartner = async () => {
    if (!user || !currentPartnerId) {
      toast({ title: "Error", description: "User or partner not selected.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ partner_id: currentPartnerId })
      .eq('id', user.id);

    if (error) {
      toast({ title: "Error", description: `Failed to update partner: ${error.message}`, variant: "destructive" });
      logger.error('Error updating partner:', error.message); // Replaced console.error
    } else {
      setPartnerIdGlobally(currentPartnerId);
      toast({ title: "Success", description: "Partner updated successfully." });
      onOpenChange(false); // Close sheet on successful save
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Logout Error", description: error.message, variant: "destructive" });
      logger.error('Error logging out:', error.message); // Replaced console.error
    } else {
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      setPartnerIdGlobally(null); // Clear partner ID on logout
      onOpenChange(false); // Close sheet
      // User state will be cleared by AuthProvider, triggering navigation
    }
  };

  if (authLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
          </SheetHeader>
          <div className="py-4">Loading account details...</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Account</SheetTitle>
          {userData?.username && <SheetDescription>Manage your account settings, @{userData.username}.</SheetDescription>}
        </SheetHeader>
        
        <div className="py-4 space-y-4 flex-grow">
          {user && (
            <div>
              <p className="text-sm text-muted-foreground">Logged in as:</p>
              <p className="font-semibold">{user.email ? '[EMAIL_REDACTED]' : 'No email'}</p>
            </div>
          )}

          <div>
            <Label htmlFor="partner-select">Select Partner</Label>
            {isLoadingPartners || idsLoading ? (
              <p>Loading partners...</p>
            ) : availablePartners.length > 0 ? (
              <Select value={currentPartnerId || ''} onValueChange={handlePartnerChange}>
                <SelectTrigger id="partner-select">
                  <SelectValue placeholder="Select a partner" />
                </SelectTrigger>
                <SelectContent>
                  {availablePartners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.username || p.full_name || `User ${p.id.substring(0,6)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">No partners available. Your partner needs to sign up first.</p>
            )}
          </div>
        </div>

        <SheetFooter className="mt-auto">
          <div className="flex flex-col space-y-2 w-full">
            <Button onClick={handleSavePartner} disabled={!currentPartnerId || currentPartnerId === partnerId}>
              Save Partner
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AccountSheet;
