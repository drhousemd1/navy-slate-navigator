
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Reward, RewardFrequency } from '@/contexts/rewards/types';
import { Zap, Edit3, Trash2, ShoppingCart, Gift, ShieldCheck, UserCheck, MinusCircle, PlusCircle } from 'lucide-react';
import ImageWithFallback from '@/components/ImageWithFallback';
import IconRenderer from '@/components/IconRenderer';
import WeeklyUsageTracker from './WeeklyUsageTracker';
import RewardEditorModal from '../reward-editor/RewardEditorModal'; // Ensure correct path
import { useAuth } from '@/contexts/auth';
import { useUserIds } from '@/contexts/UserIdsContext';
import { useBuySubReward, useBuyDomReward, useRedeemSubReward, useRedeemDomReward } from '@/data/rewards/mutations';
import { useDeleteReward } from '@/data/rewards/mutations'; // For deleting
import { toast } from '@/hooks/use-toast';
import DeleteRewardDialog from './DeleteRewardDialog'; // Create this component
import { logger } from '@/lib/logger';

interface RewardCardProps {
  reward: Reward;
  // Removed onBuy, onRedeem as mutations are used directly
  // Removed onEdit, onDelete as these are handled internally or via editor modal
  currentPoints: number; // Sub's points
  currentDomPoints: number; // Dom's points
  canModify?: boolean; // True if current user can edit/delete this reward
}

const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  currentPoints,
  currentDomPoints,
  canModify = false,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { user } = useAuth();
  const { subUserId, domUserId } = useUserIds();

  const buySubRewardMutation = useBuySubReward();
  const buyDomRewardMutation = useBuyDomReward();
  const redeemSubRewardMutation = useRedeemSubReward();
  const redeemDomRewardMutation = useRedeemDomReward();
  const deleteRewardMutation = useDeleteReward();

  const isSubUser = user?.id === subUserId;
  const isDomUser = user?.id === domUserId;

  const effectiveCost = useMemo(() => {
    if (reward.cost_type === 'sub_points' || !reward.cost_type) return reward.cost_points; // Default to sub_points
    if (reward.cost_type === 'dom_points') return reward.dom_cost_points || 0;
    return reward.cost_points; // Fallback
  }, [reward.cost_type, reward.cost_points, reward.dom_cost_points]);

  const canAfford = useMemo(() => {
    if (reward.cost_type === 'sub_points' || !reward.cost_type) return currentPoints >= (reward.cost_points || 0);
    if (reward.cost_type === 'dom_points') return currentDomPoints >= (reward.dom_cost_points || 0);
    return true; // Free or unassigned cost type
  }, [reward.cost_type, reward.cost_points, reward.dom_cost_points, currentPoints, currentDomPoints]);

  const handleBuy = async () => {
    if (!user || !subUserId || !domUserId) {
      toast({ title: "Error", description: "User information not available.", variant: "destructive" });
      return;
    }
    if (!reward.id) {
       toast({ title: "Error", description: "Reward ID is missing.", variant: "destructive" });
       return;
    }

    logger.log(`Attempting to buy reward: ${reward.title} by user ${user.id}. Cost type: ${reward.cost_type}`);

    try {
      if (reward.cost_type === 'sub_points' || !reward.cost_type) { // Sub buys with their points
        await buySubRewardMutation.mutateAsync({ rewardId: reward.id, userId: subUserId, cost: reward.cost_points || 0 });
      } else if (reward.cost_type === 'dom_points') { // Dom buys with their points (for Sub)
        await buyDomRewardMutation.mutateAsync({ rewardId: reward.id, userId: domUserId, cost: reward.dom_cost_points || 0, subIdToCredit: subUserId });
      } else {
        toast({ title: "Unsupported", description: "This reward has an unsupported cost type.", variant: "destructive" });
      }
    } catch (error) {
      // Mutation hooks should handle their own error toasts. This is a fallback.
      logger.error("Error in handleBuy:", error);
      if (!(error instanceof Error && error.message.includes("Insufficient"))) { // Avoid double toast for known handled errors
        toast({ title: "Purchase Failed", description: "Could not complete the purchase.", variant: "destructive" });
      }
    }
  };

  const handleRedeem = async () => {
     if (!user || !subUserId || !domUserId) {
      toast({ title: "Error", description: "User information not available.", variant: "destructive" });
      return;
    }
    if (!reward.id) {
       toast({ title: "Error", description: "Reward ID is missing.", variant: "destructive" });
       return;
    }
    logger.log(`Attempting to redeem reward: ${reward.title} by user ${user.id}. Redemption type: ${reward.redemption_type}`);

    try {
      if (reward.redemption_type === 'sub_redeems') { // Sub redeems
        await redeemSubRewardMutation.mutateAsync({ rewardId: reward.id, userId: subUserId });
      } else if (reward.redemption_type === 'dom_redeems') { // Dom redeems (for Sub)
        await redeemDomRewardMutation.mutateAsync({ rewardId: reward.id, userId: domUserId, subIdToApply: subUserId });
      } else {
        toast({ title: "Unsupported", description: "This reward has an unsupported redemption type.", variant: "destructive" });
      }
    } catch (error) {
      logger.error("Error in handleRedeem:", error);
      // Mutation hooks should handle their own error toasts.
       if (!(error instanceof Error && error.message.includes("not available for redemption"))) {
        toast({ title: "Redemption Failed", description: "Could not complete redemption.", variant: "destructive" });
      }
    }
  };

  const handleDelete = async () => {
    if (!reward.id) {
      toast({ title: "Error", description: "Reward ID missing, cannot delete.", variant: "destructive" });
      return;
    }
    try {
      await deleteRewardMutation.mutateAsync(reward.id);
      // Success toast is handled by useDeleteReward
      setIsDeleteDialogOpen(false); // Close dialog on success
    } catch (error) {
      // Error toast is handled by useDeleteReward
      logger.error(`Failed to delete reward ${reward.id}:`, error);
    }
  };

  const cardStyle = {
    borderColor: reward.highlight_effect ? (reward.calendar_color || '#FFD700') : undefined,
    boxShadow: reward.highlight_effect ? `0 0 10px ${reward.calendar_color || '#FFD700'}33, 0 0 5px ${reward.calendar_color || '#FFD700'}22` : undefined,
  };

  const isPurchasableByCurrentUser = 
    (isSubUser && (reward.cost_type === 'sub_points' || !reward.cost_type)) || 
    (isDomUser && reward.cost_type === 'dom_points');

  const isRedeemableByCurrentUser =
    (isSubUser && reward.redemption_type === 'sub_redeems') ||
    (isDomUser && reward.redemption_type === 'dom_redeems');

  const hasSupply = reward.supply === null || reward.supply === undefined || reward.supply > 0; // Treat null/undefined as infinite supply

  // Determine if the "Buy" button should be shown and enabled
  const showBuyButton = reward.cost_points > 0 || reward.dom_cost_points > 0; // Show if there's any cost
  const buyButtonDisabled = !canAfford || !isPurchasableByCurrentUser || !hasSupply || 
                            buySubRewardMutation.isPending || buyDomRewardMutation.isPending;

  // Determine if the "Redeem" button should be shown and enabled
  const showRedeemButton = true; // Always show redeem if available, disable if not owned or not redeemable by user
  const redeemButtonDisabled = !reward.is_available_for_redemption || !isRedeemableByCurrentUser ||
                               redeemSubRewardMutation.isPending || redeemDomRewardMutation.isPending;


  return (
    <>
      <Card className="relative flex flex-col bg-card text-card-foreground rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full" style={cardStyle}>
        <CardHeader className="relative p-0 h-48">
          <ImageWithFallback
            src={reward.background_image_url}
            alt={reward.title || "Reward background"}
            className="w-full h-full object-cover"
            fallbackClassName="bg-gradient-to-br from-slate-800 to-slate-900"
            style={{ 
              objectPosition: `${reward.focal_point_x || 50}% ${reward.focal_point_y || 50}%`,
              opacity: (reward.background_opacity !== undefined ? reward.background_opacity : 50) / 100,
            }}
          />
          <div className="absolute inset-0 bg-black/30 flex flex-col justify-between p-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-black/50 rounded-full">
                <IconRenderer iconName={reward.icon_name} iconUrl={reward.icon_url} color={reward.icon_color || '#FFFFFF'} className="h-8 w-8" />
              </div>
              {canModify && (
                <div className="flex space-x-2">
                  <Button variant="icon" size="icon" className="bg-black/50 hover:bg-black/70 text-white rounded-full" onClick={() => setIsEditorOpen(true)}>
                    <Edit3 size={18} />
                  </Button>
                  <Button variant="icon" size="icon" className="bg-black/50 hover:bg-black/70 text-destructive rounded-full" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              )}
            </div>
             <CardTitle className="text-2xl font-bold truncate" style={{ color: reward.title_color || '#FFFFFF' }}>
              {reward.title}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow p-4 space-y-3">
          <p className="text-sm line-clamp-3" style={{ color: reward.subtext_color || '#8E9196' }}>
            {reward.description}
          </p>
          
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold" style={{color: reward.calendar_color || '#4ADE80'}}>Cost:</span>
            <div className="flex items-center">
              <Zap size={16} className="mr-1" style={{color: reward.calendar_color || '#4ADE80'}}/> 
              {effectiveCost} {reward.cost_type === 'dom_points' ? 'Dom Points' : 'Points'}
            </div>
          </div>

          {(reward.supply !== null && reward.supply !== undefined) && (
             <div className="flex items-center justify-between text-sm">
                <span className="font-semibold" style={{color: reward.calendar_color || '#4ADE80'}}>Supply Left:</span>
                <span>{reward.supply}</span>
            </div>
          )}

          {reward.redemption_type === 'sub_redeems' && <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300"><UserCheck size={12} className="mr-1"/> Sub Redeems</span>}
          {reward.redemption_type === 'dom_redeems' && <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300"><ShieldCheck size={12} className="mr-1"/> Dom Redeems</span>}

          {reward.usage_data && reward.usage_data.length > 0 && (
            <div className="pt-2">
              <WeeklyUsageTracker usageData={reward.usage_data} calendarColor={reward.calendar_color || '#4ADE80'} />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="grid grid-cols-2 gap-2 p-4 border-t border-border/20">
          {showBuyButton && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleBuy}
              disabled={buyButtonDisabled}
              aria-label={`Buy ${reward.title}`}
            >
              {buySubRewardMutation.isPending || buyDomRewardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart size={16} className="mr-2" />
              )}
              Buy
            </Button>
          )}

          {showRedeemButton && (
             <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleRedeem}
              disabled={redeemButtonDisabled}
              aria-label={`Redeem ${reward.title}`}
            >
              {redeemSubRewardMutation.isPending || redeemDomRewardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Gift size={16} className="mr-2" />
              )}
              Redeem
            </Button>
          )}

          {/* Fallback if no cost and not explicitly redeemable, or as a placeholder */}
          {!showBuyButton && !showRedeemButton && (
            <p className="col-span-2 text-center text-sm text-muted-foreground">No actions available.</p>
          )}
        </CardFooter>
      </Card>

      {canModify && isEditorOpen && (
        <RewardEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          rewardData={reward}
        />
      )}
      {canModify && (
        <DeleteRewardDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDelete={handleDelete}
            rewardName={reward.title || "this reward"}
            isDeleting={deleteRewardMutation.isPending}
        />
      )}
    </>
  );
};

export default RewardCard;
