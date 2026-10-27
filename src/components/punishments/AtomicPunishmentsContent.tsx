import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import PunishmentsHeader from './PunishmentsHeader';
import PunishmentEditor from '@/components/PunishmentEditor';
import PunishmentBackground from './PunishmentBackground';
import PunishmentCardHeader from './PunishmentCardHeader';
import PunishmentCardContent from './PunishmentCardContent';
import PunishmentCardFooter from './PunishmentCardFooter';
import { Card } from '@/components/ui/card';
import { RecordingActivity } from '@/components/recordings/RecordingActivity';
import { useRecordingData } from '@/data/recordings/useRecordingData';
import { reviewedRecordingContext, savedWeekday, type RecordingDefinition } from '@/data/recordings/readModel';
import type { PunishmentData } from '@/contexts/punishments/types';

export function AtomicPunishmentsContent({ contentRef }: { contentRef: MutableRefObject<{ handleAddNewPunishment?: () => void }> }) {
  const state = useRecordingData('punishment');
  const [editor, setEditor] = useState<{ punishment?: PunishmentData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState(false);
  const clickLock = useRef(false);
  const add = useCallback(() => { if (state.canManage) setEditor({}); else setError('Your relationship permission does not allow editing punishments.'); }, [state.canManage]);
  useEffect(() => { contentRef.current = { handleAddNewPunishment: add }; return () => { contentRef.current = {}; }; }, [contentRef, add]);
  const record = async (punishment: PunishmentData) => {
    if (!punishment.id || clickLock.current) return;
    clickLock.current = true; setSavingAction(true); setError(null);
    try {
      const expectedContext = reviewedRecordingContext('punishment', punishment as RecordingDefinition, state.data?.progress.find(item => item.subjectId === punishment.id));
      if (expectedContext.kind !== 'punishment_apply') throw new Error('Refresh this punishment before recording it.');
      await state.actions.enqueue({ kind: 'punishment_apply', punishmentId: punishment.id, expectedContext });
    }
    catch (e) { setError(e instanceof Error ? e.message : 'The punishment could not be saved.'); }
    finally { clickLock.current = false; setSavingAction(false); }
  };
  return <div className="p-4 pt-6 max-w-4xl mx-auto">
    <PunishmentsHeader />
    <RecordingActivity type="punishment" data={state.data} error={error || state.error?.message} refresh={state.refresh} />
    {state.actionReason && <p className="mb-3 text-sm text-gray-300">{state.actionReason}</p>}
    {state.isLoading && <p role="status" className="text-white">Loading punishments…</p>}
    {state.data && state.data.definitions.length === 0 && <p className="text-gray-300">No punishments yet. Use Add to create one.</p>}
    <div className="space-y-4">{[...(state.data?.definitions as PunishmentData[] ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).map(punishment => {
      const progress = state.data?.progress.find(item => item.subjectId === punishment.id);
      return <Card key={punishment.id} className="relative overflow-hidden border-2 border-red-500 bg-navy">
        <PunishmentBackground {...punishment} />
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <PunishmentCardHeader points={punishment.points} dom_points={punishment.dom_points} dom_supply={punishment.dom_supply}
            onPunish={() => void record(punishment)} disabled={!!state.actionReason || state.pending || savingAction || !progress?.expectedContext} />
          <PunishmentCardContent {...punishment} />
          {progress?.expectedContext?.kind === 'punishment_apply' && <div className="text-xs text-gray-300">
            <p>Sub actions: {progress.expectedContext.sub.localDate} · {progress.expectedContext.sub.timeZone}</p>
            {progress.expectedContext.dom && <p>Dom award: {progress.expectedContext.dom.localDate} · {progress.expectedContext.dom.timeZone}</p>}
          </div>}
          <PunishmentCardFooter frequency_count={progress?.currentCount ?? 0} usage_data={[...(progress?.usageData ?? [0,0,0,0,0,0,0])]}
            calendar_color={punishment.calendar_color} currentDayIndex={savedWeekday(progress?.localDate)} editDisabled={!state.canManage}
            onEdit={() => setEditor({ punishment })} />
        </div>
      </Card>;
    })}</div>
    {editor && <PunishmentEditor isOpen preserveHistory punishmentData={editor.punishment} onClose={() => setEditor(null)}
      onSave={async values => { const saved = await state.save(values); setEditor(null); return saved as PunishmentData; }}
      onDelete={editor.punishment?.id ? async id => { await state.remove(id); setEditor(null); } : undefined} />}
  </div>;
}
