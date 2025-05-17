
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RuleCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-3/4" /> {/* Title */}
      <Skeleton className="h-5 w-20" /> {/* Points/Violation count */}
    </div>
    <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
    <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-20" /> {/* Edit Button */}
      <Skeleton className="h-8 w-24" /> {/* Mark Broken Button */}
    </div>
  </div>
);

export default RuleCardSkeleton;
