
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TaskCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    {/* Header: Icon and Title */}
    <div className="flex items-center space-x-3">
      <Skeleton className="h-8 w-8 rounded-full" /> {/* Icon placeholder */}
      <Skeleton className="h-6 w-3/4" /> {/* Title placeholder */}
    </div>

    {/* Description */}
    <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
    <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}

    {/* Info: Points and Frequency */}
    <div className="flex justify-between items-center text-sm text-slate-400 pt-1">
      <Skeleton className="h-5 w-20" /> {/* Points placeholder */}
      <Skeleton className="h-5 w-24" /> {/* Frequency/Completion placeholder */}
    </div>

    {/* Footer: Action Buttons */}
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-24" /> {/* Complete Button placeholder */}
      <Skeleton className="h-8 w-20" /> {/* Edit Button placeholder */}
    </div>
  </div>
);

export default TaskCardSkeleton;
