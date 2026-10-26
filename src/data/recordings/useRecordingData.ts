import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { scopeKey } from '@/data/actions/contracts';
import { readRecordingData, recordingKey, removeRecordingDefinition, saveRecordingDefinition, type RecordingType } from './readModel';
import type { Rule } from '@/data/interfaces/Rule';
import type { PunishmentData } from '@/contexts/punishments/types';

export function useRecordingData(type: RecordingType) {
  const actions = useActionCommands();
  const identity = useUserIds();
  const client = useQueryClient();
  const scope = actions.mode === 'atomic' ? actions.scope : null;
  const scopeId = scope ? scopeKey(scope) : null;
  const current = useRef(scopeId); current.current = scopeId;
  const query = useQuery({ queryKey: recordingKey(scope, type), enabled: !!scope,
    queryFn: ({ signal }) => readRecordingData(scope!, type, !!identity.subUserId, signal),
    staleTime: 0, retry: false, refetchOnMount: 'always', refetchOnWindowFocus: true, refetchInterval: 10_000 });
  const refresh = useCallback(async () => { if (scope) await client.invalidateQueries({ queryKey: recordingKey(scope, type), exact: true }); }, [client, scope, type]);
  const canManage = !!identity.currentRole && ['both', identity.currentRole].includes(identity.permissions?.definition_manage);
  const save = async (values: Partial<Rule & PunishmentData>) => {
    if (!scope || !canManage) throw new Error('Your relationship permission does not allow editing.');
    const result = await saveRecordingDefinition(scope, type, values, () => current.current === scopeId);
    await refresh(); return result;
  };
  const remove = async (id: string) => {
    if (!scope || !canManage) throw new Error('Your relationship permission does not allow removal.');
    await removeRecordingDefinition(scope, type, id, () => current.current === scopeId); await refresh();
  };
  const pending = actions.entries.some(entry => entry.canReplay && ['pending', 'sending', 'confirmation_unknown'].includes(entry.state.status));
  const operation = type === 'rule' ? 'rule_violation' : 'punishment_apply';
  const allowed = !!identity.currentRole && ['both', identity.currentRole].includes(identity.permissions?.[operation]);
  const actionReason = !identity.subUserId ? 'Link a Sub partner before recording this action.' : !allowed ? 'Your relationship settings do not allow recording this action.' : null;
  return { ...query, refresh, save, remove, canManage, pending, actionReason, actions, identity };
}
