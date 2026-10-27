import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface NetworkStatusContextType {
  /** Browser reachability hint only; this is not proof the backend answered. */
  isOnline: boolean;
  lastOnlineTime: Date | null;
  reconnectTime: Date | null;
}
export const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [reconnectTime, setReconnectTime] = useState<Date | null>(null);
  useEffect(() => {
    const online = () => { setIsOnline(true); setReconnectTime(new Date()); };
    const offline = () => { setIsOnline(false); setLastOnlineTime(new Date()); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);
  // Durable action state belongs to ActionCommandsProvider, not React Query's
  // mutation count. Connection events never announce successful synchronization.
  return <NetworkStatusContext.Provider value={{ isOnline, lastOnlineTime, reconnectTime }}>{children}</NetworkStatusContext.Provider>;
}
