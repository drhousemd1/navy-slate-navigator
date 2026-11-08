import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import PunishmentsHeader from './PunishmentsHeader';
import PunishmentList from './PunishmentList';
import { PunishmentCardView } from './PunishmentCardView';
import PunishmentEditor from '@/components/PunishmentEditor';
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
    <PunishmentsHeader onOpenHistory={() => setHistoryOpen(true)} />
    <RecordingActivity type="punishment" data={state.data} error={error || state.error?.message} refresh={state.refresh} historyOpen={historyOpen} onHistoryOpenChange={setHistoryOpen} />
    <Button className="mb-4 bg-red-600 hover:bg-red-700 text-white" disabled={!!state.actionReason || state.pending || savingAction}
      onClick={() => setRandomView(view)}><Shuffle className="mr-2 h-4 w-4" />Random Punishment</Button>
    {state.actionReason && <p className="mb-3 text-sm text-white">{state.actionReason}</p>}
    <PunishmentList
      punishments={[...(state.data?.definitions as PunishmentData[] ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))}
      isLoading={state.isLoading} error={state.error}
      onEditPunishment={punishment => setEditor({ punishment })}
      renderCard={punishment => {
        const progress = state.data?.progress.find(item => item.subjectId === punishment.id);
        return <PunishmentCardView {...punishment}
          frequency_count={progress?.currentCount ?? 0} usage_data={[...(progress?.usageData ?? [0,0,0,0,0,0,0])]}
          currentDayIndex={savedWeekday(progress?.localDate)} editDisabled={!state.canManage}
          disabled={!!state.actionReason || state.pending || savingAction || !progress?.expectedContext}
          onPunish={() => void record(punishment).catch(cause => { if (mounted.current && currentView.current === view) setError(cause instanceof Error ? cause.message : 'The punishment could not be saved.'); })}
          onEdit={() => setEditor({ punishment })} />;
      }} />
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
