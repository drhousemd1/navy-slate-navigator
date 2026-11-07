import React from 'react';
import AppLayout from '@/components/AppLayout';
import WellbeingHeader from '@/components/wellbeing/WellbeingHeader';
import WellbeingForm from '@/components/wellbeing/WellbeingForm';
import { useWellbeingQuery } from '@/data/wellbeing/queries';
import { useWellbeingScope, wellbeingScopeKey } from '@/data/wellbeing/scope';
import { useUserIds } from '@/contexts/UserIdsContext';
import { Button } from '@/components/ui/button';
import EarlierWellbeingDrafts from '@/components/wellbeing/EarlierWellbeingDrafts';
import WellbeingHistory from '@/components/wellbeing/WellbeingHistory';

export default function Wellbeing() {
  const scope = useWellbeingScope(); const { timezone } = useUserIds();
  const query = useWellbeingQuery(scope?.accountId ?? null);
  return <AppLayout><div className="p-4 space-y-6 h-full overflow-y-auto"><WellbeingHeader /><div className="max-w-2xl mx-auto space-y-6">
    {!scope ? <p>Sign in to a verified account to record your wellbeing.</p> : query.isError ? <div role="alert"><p>Wellbeing status could not be loaded. Your saved draft is unchanged.</p><Button onClick={() => void query.refetch()}>Retry wellbeing</Button></div>
      : query.isPending ? <p role="status">Checking saved wellbeing…</p>
      : <><EarlierWellbeingDrafts key={`earlier:${JSON.stringify(wellbeingScopeKey(scope))}`} scope={scope} /><WellbeingForm key={JSON.stringify(wellbeingScopeKey(scope))} scope={scope} timezone={timezone ?? null} latest={query.data} /><WellbeingHistory scope={scope} timezone={timezone ?? null} /></>}
  </div></div></AppLayout>;
}
