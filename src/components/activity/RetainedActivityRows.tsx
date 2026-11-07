import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import type { ActivityDomain, RetainedActivityRow } from '@/data/activityArchive/types';

const person = { you: 'You', former_partner: 'Former partner', deleted_account: 'Deleted account', not_recorded: 'Not recorded' };
const labels: Record<string, string> = { task_completed: 'Completed task', reward_purchased: 'Purchased reward', reward_redeemed: 'Used reward',
  reward_gifted: 'Gifted reward', reward_deleted: 'Deleted reward', rule_violated: 'Rule violation', punishment_applied: 'Punishment recorded',
  action_undone: 'Undone action', opening_inventory: 'Starting inventory', opening_balance: 'Starting balance' };
const importedLabels: Record<ActivityDomain, string> = { task: 'Imported completion', reward: 'Imported reward-use record', rule: 'Imported rule violation', punishment: 'Imported punishment' };
const provenance: Record<string, string> = { command: 'Recorded in the app', legacy_import: 'Imported starting state', migration_credit: 'Migration valuation', legacy_record: 'Original imported record' };
const savedTime = (timestamp: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(timestamp)) + ' UTC';
export function RetainedActivityRows({ rows, domain }: { rows: RetainedActivityRow[]; domain: ActivityDomain }) {
  const text = useCoreTextClasses();
  return <div className="space-y-3">
    {rows.map(row => <article key={row.key} id={`retained-${row.key}`} className="border-t border-light-navy pt-3 text-sm space-y-1">
      <h3 className="font-semibold">{row.source === 'imported' ? importedLabels[domain] : labels[row.kind] ?? `Recorded activity: ${row.kind.replace(/_/g, ' ')}`}</h3>
      <p>{row.title.basis === 'recorded_snapshot' ? `Recorded title: ${row.title.text}` : row.title.basis === 'current_reference' ? `Title: ${row.title.text} (current name; original name not saved)` : 'Title: Not recorded or no longer available'}</p>
      <p>Saved timestamp: {row.timestamp ? <time dateTime={row.timestamp}>{savedTime(row.timestamp)}</time> : 'Not recorded'}</p>
      <p>Recorded role: {row.role === null ? 'Not recorded' : row.role === 'dom' ? 'Dom' : 'Sub'}</p>
      <p>Recorded by: {person[row.actor]} · Affected person: {person[row.beneficiary]}</p>
      {row.calendar ? <p>Recorded date: {row.calendar.localDate} · Week starting {row.calendar.weekStartDate} · {row.calendar.timeZone}</p> : <p>Recorded date and timezone: Not recorded</p>}
      {row.pointEffects === null ? <p>Points: Not recorded; no balance change can be inferred from this imported record.</p> : row.pointEffects.length === 0 ? <p>Points: No recorded balance change.</p> : row.pointEffects.map((effect, index) => <div key={index}>
        <p>{person[effect.person]} · {effect.currency === 'dom' ? 'Dom' : 'Sub'} points: {effect.amount > 0 ? '+' : ''}{effect.amount}</p>
        <p className={`text-xs ${text.secondary}`}>{effect.calendar ? `Points recorded for: ${effect.calendar.localDate} · Week starting ${effect.calendar.weekStartDate} · ${effect.calendar.timeZone}` : 'Points recorded for: Date and timezone not recorded'}</p>
      </div>)}
      {row.source === 'imported' && domain === 'reward' && <p>Saved status: {row.legacy?.used === true ? 'Used' : row.legacy?.used === false ? 'Not marked used' : 'Not recorded'}</p>}
      {row.legacy && 'pointsDeducted' in row.legacy && <p>Saved deduction: {row.legacy.pointsDeducted === null ? 'Not recorded' : `${row.legacy.pointsDeducted} points`} (legacy value; actual balance change unverified).</p>}
      {row.legacy && ('dayOfWeek' in row.legacy || 'weekNumber' in row.legacy) && <p className={`text-xs ${text.secondary}`}>Saved legacy calendar values: {'dayOfWeek' in row.legacy && `day-of-week ${row.legacy.dayOfWeek ?? 'not recorded'}`}{'dayOfWeek' in row.legacy && 'weekNumber' in row.legacy && ' · '}{'weekNumber' in row.legacy && `week ${row.legacy.weekNumber ?? 'not recorded'}`}. These values do not establish a verified date or timezone.</p>}
      {row.kind === 'opening_inventory' && <p>Imported starting inventory; this does not establish an original purchase or its price.</p>}
      {row.reversesKey && <p>Correction of an earlier event; the original is preserved.{rows.some(item => item.key === row.reversesKey) && <> <a className="underline" href={`#retained-${row.reversesKey}`}>View original record</a></>}</p>}
      <p className={`text-xs ${text.secondary}`}>Source: {provenance[row.provenance] ?? row.provenance}</p>
    </article>)}
  </div>;
}
