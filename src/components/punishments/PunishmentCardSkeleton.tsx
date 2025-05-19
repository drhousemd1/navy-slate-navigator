
import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PunishmentCardSkeleton: React.FC = () => {
  return (
    <Card className="bg-navy border-light-navy p-4 md:p-6">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-8 w-20 bg-slate-700" />
        <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
      </div>
      <div className="flex items-center mb-4">
        <Skeleton className="h-10 w-10 rounded-md mr-3 bg-slate-700" />
        <div>
          <Skeleton className="h-6 w-3/4 mb-1 bg-slate-700" />
          <Skeleton className="h-4 w-1/2 bg-slate-700" />
        </div>
      </div>
      <div className="mt-auto">
        <Skeleton className="h-10 w-full bg-slate-700" />
        <div className="flex justify-between items-center mt-2">
          <Skeleton className="h-4 w-24 bg-slate-700" />
          <Skeleton className="h-6 w-6 bg-slate-700" />
        </div>
      </div>
    </Card>
  );
};

export default PunishmentCardSkeleton;
