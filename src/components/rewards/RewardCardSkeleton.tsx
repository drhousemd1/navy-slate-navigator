
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RewardCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    <div className="flex justify-between items-start">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-8 w-8 rounded-full" /> {/* Icon */}
        <Skeleton className="h-6 w-40" /> {/* Title */}
      </div>
      <Skeleton className="h-5 w-20" /> {/* Points */}
    </div>
    <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
    <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-24" /> {/* Use Reward Button */}
      <Skeleton className="h-8 w-20" /> {/* Edit Button */}
    </div>
  </div>
);

export default RewardCardSkeleton;
