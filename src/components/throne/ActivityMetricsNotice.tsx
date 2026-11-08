import { Button } from '@/components/ui/button';
import type { ActivityMetrics } from '@/data/metrics/projection';
import { addDays } from '@/data/metrics/projection';

export function ActivityMetricsNotice({ metrics }: { metrics?: ActivityMetrics }) {
  if (!metrics) return null;
  const { ranges, retainedLegacy, mode } = metrics;
  const retainedCount = Object.values(retainedLegacy).reduce((sum, value) => sum + value, 0);
  if (mode === 'atomic' && retainedCount === 0) return null;
  const differentRanges = new Set(ranges.map(range => `${range.start}/${range.end}`)).size > 1;
  return <details className={`text-xs mt-3 text-nav-inactive`}><summary className="cursor-pointer">Activity details</summary><div className="space-y-2 mt-2">
    <p>{ranges.map(range => `${range.role === 'sub' ? 'Sub' : 'Dom'}: ${range.timeZone}${differentRanges ? ` · ${range.start} to ${addDays(range.end, -1)}` : ''}`).join(' • ')}.
      {mode === 'atomic' ? ' Activity uses the date and role saved with each action. Undone actions are excluded.' : ' Earlier activity uses current task/reward roles and saved timezones; original roles and timezones were not recorded.'}</p>
    {mode === 'atomic' && retainedCount > 0 && <div className="rounded border border-light-navy p-3">
      <p className={`font-medium text-gray-200`}>Earlier records — all retained dates in this relationship</p>
      <p>{retainedLegacy.task} task completions · {retainedLegacy.rule} rule violations · {retainedLegacy.reward} reward-use records · {retainedLegacy.punishment} punishments.</p>
      <p>These records are preserved separately from the weekly/monthly totals. Their original roles or timezones were not recorded, so they cannot be assigned accurately to the counts above.</p>
    </div>}
    {mode === 'legacy' && metrics.unclassifiedLegacy > 0 && <p>{metrics.unclassifiedLegacy} retained records across all dates cannot be classified from their remaining definitions or dates and are not included in these totals.</p>}
  </div></details>;
}

export function ActivityMetricsError({ error, retry }: { error: Error; retry: () => unknown }) {
  return <div role="alert" className={`p-4 text-sm text-red-400`}>
    <p>Activity unavailable. {error.message}</p>
    <Button type="button" variant="outline" size="sm" className="mt-2 bg-navy hover:bg-light-navy text-white border-light-navy" onClick={() => void retry()}>Retry activity</Button>
  </div>;
}
