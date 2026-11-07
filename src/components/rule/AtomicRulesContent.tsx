import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RulesHeader from './RulesHeader';
import RuleCard from './RuleCard';
import RuleEditor from '@/components/RuleEditor';
import { RecordingActivity } from '@/components/recordings/RecordingActivity';
import { useRecordingData } from '@/data/recordings/useRecordingData';
import { reviewedRecordingContext, savedWeekday, type RecordingDefinition } from '@/data/recordings/readModel';
import type { Rule } from '@/data/interfaces/Rule';
import { sortRulesByPriorityAndDate } from '@/lib/ruleSorting';

export function AtomicRulesContent() {
  const text = useCoreTextClasses();
  const state = useRecordingData('rule');
  const navigate = useNavigate();
  const [editor, setEditor] = useState<{ rule?: Rule } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState(false);
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
    <RulesHeader />
    <RecordingActivity type="rule" data={state.data} error={error || state.error?.message} refresh={state.refresh} />
    {state.actionReason && <p className={`mb-3 text-sm ${text.secondary}`}>{state.actionReason}</p>}
    {state.isLoading && <p role="status" className={text.primary}>Loading rules…</p>}
    {state.data && rules.length === 0 && <p className={text.secondary}>No rules yet. Use Add to create one.</p>}
    <div className="space-y-4 mt-4">{sortRulesByPriorityAndDate(rules).map(rule => {
      const progress = state.data?.progress.find(item => item.subjectId === rule.id);
      return <div key={rule.id}>
        {progress?.expectedContext && <p className={`mb-1 text-xs ${text.secondary}`}>Sub actions: {progress.localDate} · {progress.timeZone}</p>}
        <RuleCard rule={{ ...rule, usage_data: [...(progress?.usageData ?? [0,0,0,0,0,0,0])] }}
        currentDayIndex={savedWeekday(progress?.localDate)} disabled={!!state.actionReason || state.pending || savingAction || !progress?.expectedContext}
        editDisabled={!state.canManage} onRuleBroken={() => void record(rule)} onEditRule={value => setEditor({ rule: value })} /></div>;
    })}</div>
    {editor && <RuleEditor isOpen preserveHistory ruleData={editor.rule} onClose={() => setEditor(null)}
      onSave={async values => { await state.save(values); setEditor(null); }}
      onDelete={editor.rule ? async id => { await state.remove(id); setEditor(null); } : undefined} />}
  </div>;
}
