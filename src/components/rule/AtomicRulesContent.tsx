import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RulesHeader from './RulesHeader';
import RulesList from './RulesList';
import RuleEditor from '@/components/RuleEditor';
import { RecordingActivity } from '@/components/recordings/RecordingActivity';
import { useRecordingData } from '@/data/recordings/useRecordingData';
import { reviewedRecordingContext, savedWeekday, type RecordingDefinition } from '@/data/recordings/readModel';
import type { Rule } from '@/data/interfaces/Rule';

export function AtomicRulesContent() {
  const state = useRecordingData('rule');
  const navigate = useNavigate();
  const [editor, setEditor] = useState<{ rule?: Rule } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const clickLock = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const add = useCallback(() => { if (state.canManage) setEditor({}); else setError('Your relationship permission does not allow editing rules.'); }, [state.canManage]);
  useEffect(() => { const element = container.current; element?.addEventListener('add-new-rule', add); return () => element?.removeEventListener('add-new-rule', add); }, [add]);
  const record = async (rule: Rule) => {
    if (clickLock.current) return;
    clickLock.current = true; setSavingAction(true); setError(null);
    try {
      const expectedContext = reviewedRecordingContext('rule', rule as RecordingDefinition, state.data?.progress.find(item => item.subjectId === rule.id));
      if (expectedContext.kind !== 'rule_violation') throw new Error('Refresh this rule before recording it.');
      await state.actions.enqueue({ kind: 'rule_violation', ruleId: rule.id, expectedContext }); navigate('/punishments');
    }
    catch (e) { setError(e instanceof Error ? e.message : 'The violation could not be saved.'); }
    finally { clickLock.current = false; setSavingAction(false); }
  };
  const rules = (state.data?.definitions ?? []) as Rule[];
  return <div ref={container} className="p-4 pt-6 max-w-4xl mx-auto RulesContent">
    <RulesHeader onOpenHistory={() => setHistoryOpen(true)} />
    <RecordingActivity type="rule" data={state.data} error={error || state.error?.message} refresh={state.refresh} historyOpen={historyOpen} onHistoryOpenChange={setHistoryOpen} />
    {state.actionReason && <p className="mb-3 text-sm text-white">{state.actionReason}</p>}
    <RulesList
      rules={rules.map(rule => ({ ...rule, usage_data: [...(state.data?.progress.find(item => item.subjectId === rule.id)?.usageData ?? [0,0,0,0,0,0,0])] }))}
      isLoading={state.isLoading} error={state.error}
      getCardState={rule => {
        const progress = state.data?.progress.find(item => item.subjectId === rule.id);
        return { currentDayIndex: savedWeekday(progress?.localDate),
          disabled: !!state.actionReason || state.pending || savingAction || !progress?.expectedContext,
          editDisabled: !state.canManage };
      }}
      onRuleBroken={rule => void record(rule)} onEditRule={rule => setEditor({ rule })} />
    {editor && <RuleEditor isOpen preserveHistory ruleData={editor.rule} onClose={() => setEditor(null)}
      onSave={async values => { await state.save(values); setEditor(null); }}
      onDelete={editor.rule ? async id => { await state.remove(id); setEditor(null); } : undefined} />}
  </div>;
}
