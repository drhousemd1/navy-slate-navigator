import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listWellbeing } from '@/data/wellbeing/api';
import { dateRange, localDateAt } from '@/data/wellbeing/calendar';
import { wellbeingScopeKey } from '@/data/wellbeing/scope';
import type { WellbeingScope, WellbeingSnapshot } from '@/data/wellbeing/types';
import { METRIC_DEFINITIONS } from '@/lib/wellbeingUtils';
import { Button } from '@/components/ui/button';
import { checkinTime, legacyCreatedTime } from '@/data/wellbeing/calendar';

export default function WellbeingHistory({ scope, timezone }: { scope: WellbeingScope; timezone: string | null }) {
  const [month, setMonth] = useState(() => timezone ? localDateAt(timezone).slice(0, 7) : '');
  const valid = /^\d{4}-\d{2}$/.test(month) && Number(month.slice(5)) >= 1 && Number(month.slice(5)) <= 12;
  const range = valid ? dateRange(`${month}-01`, true) : null;
  const query = useQuery({ queryKey: ['wellbeing-history-v2', ...wellbeingScopeKey(scope), month], retry: false, enabled: !!range,
    queryFn: async ({ signal }) => ({ dated: await listWellbeing(scope, scope.accountId, range!, signal), legacy: await listWellbeing(scope, scope.accountId, null, signal) }) });
  const entry = (row: WellbeingSnapshot) => <details key={row.id} className="border-t border-light-navy py-3">
    <summary className="cursor-pointer text-sm">{checkinTime(row)} · {row.overallScore}/100</summary>
    {row.clientReportedAt && <p className="text-xs text-gray-400 mt-2">Save chosen at {new Date(row.clientReportedAt).toLocaleString()} (device-reported time; the saved calendar date is server-recorded).</p>}
    {row.provenance === 'legacy_snapshot' && <p className="text-xs text-gray-400 mt-2">Original row created {legacyCreatedTime(row)}. Earlier overwritten check-ins cannot be recovered. Stored score retained.</p>}
    <dl className="grid grid-cols-2 gap-2 text-sm mt-2">{Object.entries(METRIC_DEFINITIONS).map(([key, definition]) => <div key={key}><dt className="text-gray-400">{definition.label}</dt><dd>{row.metrics[key as keyof typeof row.metrics] ?? 'Not recorded'}</dd></div>)}</dl>
  </details>;
  return <section className="rounded-lg bg-navy border border-light-navy p-4 text-white space-y-3" aria-label="Wellbeing history">
    <h2 className="font-semibold">Your check-in history</h2><label className="text-sm">Month <input aria-label="History month" type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-dark-navy border border-light-navy rounded p-2 ml-2" /></label>
    <p className="text-xs text-gray-400">Every confirmed check-in is retained. Charts show the latest one on each saved local date.</p>
    {!valid ? <p className="text-sm text-gray-400">Choose a month to view dated check-ins.</p> : query.isError ? <div role="alert"><p>History could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry history</Button></div> : query.isPending ? <p role="status">Checking history…</p> : <>
      {query.data?.dated.length ? query.data.dated.map(entry) : <p className="text-sm text-gray-400">No check-ins recorded in this month.</p>}
      {!!query.data?.legacy.length && <div><h3 className="text-sm font-semibold">Imported status records · original local dates unknown</h3>{query.data.legacy.map(entry)}</div>}
    </>}
  </section>;
}
