import type { UseFormReturn } from 'react-hook-form';
import type { LocalTaskFormValues } from './TaskFormProvider';
import FrequencySelector from './FrequencySelector';
import NumberField from './NumberField';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useId } from 'react';

/** Definition-only controls. Completion counts and due instants remain server-owned. */
export function TaskScheduleFields({ form, atomic, disabled }: { form: UseFormReturn<LocalTaskFormValues>; atomic: boolean; disabled: boolean }) {
  const frequency = form.watch('frequency');
  const hasDeadline = form.watch('deadline_time') != null;
  const id = useId();
  const setDeadline = (enabled: boolean) => {
    form.setValue('deadline_time', enabled ? '23:59' : null, { shouldDirty: true });
    form.setValue('deadline_date', null, { shouldDirty: true });
    form.setValue('deadline_weekday', enabled && frequency === 'weekly' ? 7 : null, { shouldDirty: true });
  };
  return <fieldset disabled={disabled} onKeyDown={event => {
    // Enter confirms native schedule controls; saving is an explicit form action.
    const target = event.target;
    if (event.key === 'Enter' && (target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && ['date', 'time'].includes(target.type)))) event.preventDefault();
  }}>
    <legend className="sr-only">Task schedule</legend>
    <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FrequencySelector control={form.control} allowOnce={atomic} onFrequencyChange={value => {
        if (value === 'once') form.setValue('frequency_count', 1, { shouldDirty: true });
        // A recurring clock must not silently become a one-time date (or vice versa).
        setDeadline(false);
      }} />
      {frequency !== 'once' &&
        <NumberField control={form.control} name="frequency_count" label="Times per period" minValue={1}
          onIncrement={() => form.setValue('frequency_count', form.getValues('frequency_count') + 1, { shouldDirty: true })}
          onDecrement={() => form.setValue('frequency_count', Math.max(1, form.getValues('frequency_count') - 1), { shouldDirty: true })} />}
    </div>
    {atomic && <>
      <div className="flex items-center justify-between">
        <label htmlFor={`${id}-mandatory`} className="text-sm font-medium text-white">Mandatory task</label>
        <Switch id={`${id}-mandatory`} disabled={disabled} checked={form.watch('mandatory') ?? false}
          onCheckedChange={value => form.setValue('mandatory', value, { shouldDirty: true })} />
      </div>
      <div className="flex items-center justify-between">
        <label htmlFor={`${id}-deadline`} className="text-sm font-medium text-white">Set a deadline</label>
        <Switch id={`${id}-deadline`} disabled={disabled} checked={hasDeadline} onCheckedChange={setDeadline} />
      </div>
      {hasDeadline && <div className="space-y-3 text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frequency === 'once' && <label className="space-y-1 text-sm font-medium">Due date<Input className="bg-dark-navy border-light-navy text-white" type="date" required min="0001-01-01" max="9999-12-31"
            value={form.watch('deadline_date') ?? ''} onChange={event => form.setValue('deadline_date', event.target.value || null, { shouldDirty: true })} /></label>}
          {frequency === 'weekly' && <label className="space-y-1 text-sm font-medium">Due weekday<select aria-label="Due weekday" className="block h-10 w-full rounded-md border border-light-navy bg-dark-navy px-3 py-2 text-sm text-white"
            value={form.watch('deadline_weekday') ?? 7} onChange={event => form.setValue('deadline_weekday', Number(event.target.value), { shouldDirty: true })}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
          </select></label>}
          <label className="space-y-1 text-sm font-medium">{frequency === 'daily' ? 'Due time each day' : 'Due time'}<Input className="bg-dark-navy border-light-navy text-white" type="time" required step={60}
            value={form.watch('deadline_time') ?? ''} onChange={event => form.setValue('deadline_time', event.target.value, { shouldDirty: true })} /></label>
        </div>
      </div>}
    </>}
    </div>
  </fieldset>;
}
