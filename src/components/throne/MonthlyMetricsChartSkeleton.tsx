
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MonthlyMetricsChartSkeleton: React.FC = () => {
  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <Skeleton className="h-6 w-1/3 mb-2 bg-light-navy/30" /> {/* Title Skeleton */}
        <div className="h-64"> {/* Matches MonthlyMetricsChart height */}
          <Skeleton className="w-full h-full bg-light-navy/30 rounded" /> {/* Chart Area Skeleton */}
        </div>
        <div className="flex justify-between items-center flex-wrap mt-2 gap-2">
          <Skeleton className="h-4 w-1/5 bg-light-navy/30" /> {/* Legend Item Skeleton */}
          <Skeleton className="h-4 w-1/5 bg-light-navy/30" /> {/* Legend Item Skeleton */}
          <Skeleton className="h-4 w-1/5 bg-light-navy/30" /> {/* Legend Item Skeleton */}
          <Skeleton className="h-4 w-1/5 bg-light-navy/30" /> {/* Legend Item Skeleton */}
        </div>
      </div>
    </Card>
  );
};

export default MonthlyMetricsChartSkeleton;
