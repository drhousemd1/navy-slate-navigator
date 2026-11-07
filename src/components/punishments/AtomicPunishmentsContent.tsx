import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
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
import { scopeKey } from '@/data/actions/contracts';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';
import RandomPunishmentSelections from './RandomPunishmentSelections';
import { reviewRandomPunishments, type ReviewedPunishment } from './hooks/randomPunishmentReview';

export function AtomicPunishmentsContent({ contentRef }: { contentRef: MutableRefObject<{ handleAddNewPunishment?: () => void }> }) {
  const state = useRecordingData('punishment');
  const [editor, setEditor] = useState<{ punishment?: PunishmentData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState(false);
  const viewKey = JSON.stringify([state.actions.scope ? scopeKey(state.actions.scope) : null, state.identity.currentRole]);
  const currentView = useRef({ key: viewKey });
  if (currentView.current.key !== viewKey) currentView.current = { key: viewKey };
  const view = currentView.current;
  const latest = useRef(state); latest.current = state;
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [randomView, setRandomView] = useState<typeof view | null>(null);
  const clickLock = useRef(false);
  useEffect(() => {
    clickLock.current = false; setSavingAction(false); setError(null); setRandomView(null);
  }, [viewKey]);
  const randomReview = useMemo(() => {
    if (!state.data || state.actionReason) return { options: [], error: null };
    try { return { options: reviewRandomPunishments(state.data), error: null }; }
    catch (cause) { return { options: [], error: cause instanceof Error ? cause.message : 'Refresh punishments before picking again.' }; }
  }, [state.data, state.actionReason]);
  const add = useCallback(() => { if (state.canManage) setEditor({}); else setError('Your relationship permission does not allow editing punishments.'); }, [state.canManage]);
  useEffect(() => { contentRef.current = { handleAddNewPunishment: add }; return () => { contentRef.current = {}; }; }, [contentRef, add]);
  const record = async (punishment: PunishmentData, reviewed?: ReviewedPunishment) => {
    if (!mounted.current || currentView.current !== view) throw new Error('Your account or relationship changed. Pick again.');
    const current = latest.current;
    if (current.actions.mode !== 'atomic' || !current.actions.scope) throw new Error('Wait for your current punishment account to load.');
    if (clickLock.current || current.pending) throw new Error('Finish the saved action before recording another punishment.');
    if (current.actionReason) throw new Error(current.actionReason);
    if (current.error || current.isLoading || !current.data) throw new Error('Refresh punishments before recording an action.');
    const definition = current.data.definitions.find(item => item.id === punishment.id && !item.deleted_at);
    if (!definition) throw new Error('This punishment is no longer available. Pick again.');
    if (reviewed && !reviewRandomPunishments(current.data).some(item => item.reviewKey === reviewed.reviewKey)) {
      throw new Error('The punishment or action details changed. Pick again before confirming.');
    }
    clickLock.current = true; setSavingAction(true); setError(null);
    try {
      const expectedContext = reviewedRecordingContext('punishment', punishment as RecordingDefinition, current.data.progress.find(item => item.subjectId === punishment.id));
      if (expectedContext.kind !== 'punishment_apply') throw new Error('Refresh this punishment before recording it.');
      await current.actions.enqueue({ kind: 'punishment_apply', punishmentId: definition.id, expectedContext });
    }
    finally { if (mounted.current && currentView.current === view) { clickLock.current = false; setSavingAction(false); } }
  };
  return <div className="p-4 pt-6 max-w-4xl mx-auto">
    <PunishmentsHeader />
    <RecordingActivity type="punishment" data={state.data} error={error || state.error?.message} refresh={state.refresh} />
    <Button className="mb-4 bg-red-600 hover:bg-red-700 text-white" disabled={!!state.actionReason || state.pending || savingAction}
      onClick={() => setRandomView(view)}><Shuffle className="mr-2 h-4 w-4" />Random Punishment</Button>
    {state.actionReason && <p className="mb-3 text-sm text-gray-300">{state.actionReason}</p>}
    {state.isLoading && <p role="status" className="text-white">Loading punishments…</p>}
    {state.data && state.data.definitions.length === 0 && <p className="text-gray-300">No punishments yet. Use Add to create one.</p>}
    <div className="space-y-4">{[...(state.data?.definitions as PunishmentData[] ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).map(punishment => {
      const progress = state.data?.progress.find(item => item.subjectId === punishment.id);
      return <Card key={punishment.id} className="relative overflow-hidden border-2 border-red-500 bg-navy">
        <PunishmentBackground {...punishment} />
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <PunishmentCardHeader points={punishment.points} dom_points={punishment.dom_points} dom_supply={punishment.dom_supply}
            onPunish={() => void record(punishment).catch(cause => { if (mounted.current && currentView.current === view) setError(cause instanceof Error ? cause.message : 'The punishment could not be saved.'); })}
            disabled={!!state.actionReason || state.pending || savingAction || !progress?.expectedContext} />
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
    {randomView === view && <RandomPunishmentSelections options={randomReview.options}
      unavailableReason={state.actionReason || (state.pending && !savingAction ? 'Finish the saved action before picking another punishment.' : null)}
      loading={state.isLoading || !state.data} readError={state.error?.message || randomReview.error}
      onRefresh={state.refresh} onApply={selection => record(selection.punishment, selection)}
      onClose={() => setRandomView(null)} onSaved={() => {
        if (mounted.current && currentView.current === view) setRandomView(null);
      }} />}
    {editor && <PunishmentEditor isOpen preserveHistory punishmentData={editor.punishment} onClose={() => setEditor(null)}
      onSave={async values => { const saved = await state.save(values); setEditor(null); return saved as PunishmentData; }}
      onDelete={editor.punishment?.id ? async id => { await state.remove(id); setEditor(null); } : undefined} />}
  </div>;
}
