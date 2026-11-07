import { useMessageState } from './messages/useMessageState';

export function useUnreadMessages() {
  const { state, store } = useMessageState();
  return {
    // Unknown is not zero. Retain a previously confirmed count during errors.
    unreadCount: state.list ? state.list.conversations.reduce((total, row) => total + row.unreadCount, 0) : null,
    isLoading: state.loading, error: state.error, refresh: store?.refresh,
  };
}
