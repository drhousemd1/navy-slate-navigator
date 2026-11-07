import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import type { UseFormReturn } from 'react-hook-form';
import type { LocalTaskFormValues } from './TaskFormProvider';
import FrequencySelector from './FrequencySelector';
import NumberField from './NumberField';
import { Input } from '@/components/ui/input';

/** Definition-only controls. Completion counts and due instants remain server-owned. */
export function TaskScheduleFields({ form, atomic, disabled }: { form: UseFormReturn<LocalTaskFormValues>; atomic: boolean; disabled: boolean }) {
  const text = useCoreTextClasses();
  const frequency = form.watch('frequency');
  const hasDeadline = form.watch('deadline_time') != null;
  const role = form.watch('is_dom_task') ? 'Dom' : 'Sub';
  const setDeadline = (enabled: boolean) => {
    form.setValue('deadline_time', enabled ? '23:59' : null, { shouldDirty: true });
    form.setValue('deadline_date', null, { shouldDirty: true });
    form.setValue('deadline_weekday', enabled && frequency === 'weekly' ? 7 : null, { shouldDirty: true });
  };
  return <fieldset disabled={disabled} className={`space-y-4 ${text.primary}`}>
    <legend className="sr-only">Task schedule</legend>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FrequencySelector control={form.control} allowOnce={atomic} onFrequencyChange={value => {
        if (value === 'once') form.setValue('frequency_count', 1, { shouldDirty: true });
        // A recurring clock must not silently become a one-time date (or vice versa).
        setDeadline(false);
      }} />
      {frequency === 'once' ? <p className="self-center text-sm">Complete once. It stays completed until undone in History.</p> :
        <NumberField control={form.control} name="frequency_count" label="Times per period" minValue={1}
          onIncrement={() => form.setValue('frequency_count', form.getValues('frequency_count') + 1, { shouldDirty: true })}
          onDecrement={() => form.setValue('frequency_count', Math.max(1, form.getValues('frequency_count') - 1), { shouldDirty: true })} />}
    </div>
    {atomic && <>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.watch('mandatory') ?? false}
        onChange={event => form.setValue('mandatory', event.target.checked, { shouldDirty: true })} />Mandatory task</label>
      <p className="text-sm">Marks this task as required. It does not automatically apply a punishment or change points.</p>
      <label className="flex items-center gap-2"><input type="checkbox" checked={hasDeadline}
        onChange={event => setDeadline(event.target.checked)} />Set a deadline</label>
      {hasDeadline && <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frequency === 'once' && <label className="space-y-1">Due date<Input className="text-foreground" type="date" required min="0001-01-01" max="9999-12-31"
            value={form.watch('deadline_date') ?? ''} onChange={event => form.setValue('deadline_date', event.target.value || null, { shouldDirty: true })} /></label>}
          {frequency === 'weekly' && <label className="space-y-1">Due weekday<select className="block w-full rounded border border-light-navy bg-dark-navy p-2 text-foreground"
            value={form.watch('deadline_weekday') ?? 7} onChange={event => form.setValue('deadline_weekday', Number(event.target.value), { shouldDirty: true })}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
          </select></label>}
          <label className="space-y-1">{frequency === 'daily' ? 'Due time each day' : 'Due time'}<Input className="text-foreground" type="time" required step={60}
            value={form.watch('deadline_time') ?? ''} onChange={event => form.setValue('deadline_time', event.target.value, { shouldDirty: true })} /></label>
        </div>
        <p className="text-sm">Uses the {role}’s saved timezone. Late completion is allowed and earns the normal points. Changing frequency clears the deadline.</p>
      </div>}
    </>}
  </fieldset>;
}
