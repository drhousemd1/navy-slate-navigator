import React from 'react';
import AppLayout from '@/components/AppLayout';
import WellbeingHeader from '@/components/wellbeing/WellbeingHeader';
import WellbeingForm from '@/components/wellbeing/WellbeingForm';
import { useWellbeingQuery } from '@/data/wellbeing/queries';
import { useWellbeingScope, wellbeingScopeKey } from '@/data/wellbeing/scope';
import { useUserIds } from '@/contexts/UserIdsContext';
import EarlierWellbeingDrafts from '@/components/wellbeing/EarlierWellbeingDrafts';
import WellbeingHistory from '@/components/wellbeing/WellbeingHistory';
import EmptyState from '@/components/common/EmptyState';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function Wellbeing() {
  const scope = useWellbeingScope(); const { timezone } = useUserIds();
  const query = useWellbeingQuery(scope?.accountId ?? null);
  if (!scope) return <AppLayout><div className="flex items-center justify-center h-full"><EmptyState title="Authentication Required" description="Please log in to access your wellbeing data." /></div></AppLayout>;
  if (query.isError) return <AppLayout><div className="flex items-center justify-center h-full p-4"><ErrorDisplay title="Error Loading Wellbeing Data" message="Wellbeing status could not be loaded. Your saved draft is unchanged." onRetry={() => void query.refetch()} retryButtonText="Retry wellbeing" /></div></AppLayout>;
  return <AppLayout><div className="p-4 space-y-6 h-full overflow-y-auto"><WellbeingHeader /><div className="max-w-2xl mx-auto space-y-6">
    {query.isPending ? <p role="status" className="text-gray-400">Checking saved wellbeing…</p>
      : <><EarlierWellbeingDrafts key={`earlier:${JSON.stringify(wellbeingScopeKey(scope))}`} scope={scope} /><WellbeingForm key={JSON.stringify(wellbeingScopeKey(scope))} scope={scope} timezone={timezone ?? null} latest={query.data} /><WellbeingHistory scope={scope} timezone={timezone ?? null} /></>}
  </div></div></AppLayout>;
}
