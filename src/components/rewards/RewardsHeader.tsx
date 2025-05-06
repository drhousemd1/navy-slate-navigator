
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import { clearQueryCache } from '@/lib/react-query-config';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

const RewardsHeader = () => {
  const { totalPoints, domPoints, totalRewardsSupply, totalDomRewardsSupply, refreshPointsFromDatabase, refetchRewards } = useRewards();
  const queryClient = useQueryClient();

  const handleRefreshData = async () => {
    try {
      toast({
        title: "Refreshing data...",
        description: "Clearing cache and fetching latest data",
      });
      
      // Clear cache
      clearQueryCache();
      
      // Invalidate all queries to force a refetch
      queryClient.invalidateQueries();
      
      // Refetch rewards and points
      await refreshPointsFromDatabase();
      await refetchRewards();
      
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-white">Rewards</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshData}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-navy-dark p-4 rounded-lg text-center">
        <div>
          <p className="text-sm text-muted-foreground">Sub Points</p>
          <p className="text-xl font-bold text-amber-300">{totalPoints}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Dom Points</p>
          <p className="text-xl font-bold text-rose-400">{domPoints}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sub Rewards</p>
          <p className="text-xl font-bold text-amber-300">{totalRewardsSupply - totalDomRewardsSupply}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Dom Rewards</p>
          <p className="text-xl font-bold text-rose-400">{totalDomRewardsSupply}</p>
        </div>
      </div>
    </div>
  );
};

export default RewardsHeader;
