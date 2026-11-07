import { useCallback, useEffect, useRef, useState } from 'react';
import { throneTransport, ThroneError, type ThroneTransport } from '@/data/throne/api';
import type { ThroneCard, ThroneIntent } from '@/data/throne/schema';

/** The prototype's global localStorage cards and mock usage are deliberately not
 * imported: they have no verifiable owner and are not recorded activity. */
export function useCardData(accountId: string, transport: ThroneTransport = throneTransport) {
  const [state, setState] = useState<{ owner: string; cards: ThroneCard[]; loading: boolean; error: unknown }>({ owner: accountId, cards: [], loading: true, error: null });
  const currentOwner = useRef(accountId); currentOwner.current = accountId;
  const generation = useRef(0); const request = useRef<AbortController>();
  const mutations = useRef(new Set<AbortController>());
  const refresh = useCallback(async () => {
    const token = ++generation.current; request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setState(previous => ({ ...previous, owner: accountId, loading: true, error: null }));
    try {
      const cards = await transport.read(accountId, controller.signal);
      if (token === generation.current && currentOwner.current === accountId) setState({ owner: accountId, cards, loading: false, error: null });
    } catch (error) {
      if (token === generation.current && currentOwner.current === accountId) setState({ owner: accountId, cards: [], loading: false, error });
    }
  }, [accountId, transport]);
  useEffect(() => {
    void refresh(); const inFlight = mutations.current; const loadGeneration = generation;
    return () => { loadGeneration.current++; request.current?.abort(); inFlight.forEach(item => item.abort()); inFlight.clear(); };
  }, [refresh]);
  const save = useCallback(async (intent: ThroneIntent) => {
    if (currentOwner.current !== accountId) throw new ThroneError('ACCOUNT_CHANGED', true);
    const generationAtStart = generation.current;
    const controller = new AbortController(); mutations.current.add(controller);
    try {
      const receipt = await transport.write(accountId, intent, controller.signal);
      if (controller.signal.aborted || currentOwner.current !== accountId || generationAtStart !== generation.current) throw new ThroneError('ACCOUNT_CHANGED', true);
      // A verified receipt is authoritative. Do not let an older pending list
      // replace it; refresh is disabled by the editor while a command is pending.
      request.current?.abort(); generation.current++;
      setState(previous => ({ owner: accountId, loading: false, error: null,
        cards: intent.kind === 'delete' ? previous.cards.filter(card => card.id !== intent.cardId) :
          previous.cards.some(card => card.id === intent.cardId) ? previous.cards.map(card => card.id === intent.cardId
            ? { id: intent.cardId, ownerId: accountId, revision: receipt.revision, definition: intent.definition! } : card) :
            [...previous.cards, { id: intent.cardId, ownerId: accountId, revision: receipt.revision, definition: intent.definition! }] }));
      return receipt;
    } finally { mutations.current.delete(controller); }
  }, [accountId, transport]);
  return { cards: state.owner === accountId ? state.cards : [], loading: state.owner !== accountId || state.loading,
    error: state.owner === accountId ? state.error : null, refresh, save };
}
