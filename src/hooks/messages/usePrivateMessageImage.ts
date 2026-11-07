import { useEffect, useState } from 'react';
import { messageTransport } from '@/data/messages/transport';
import { messageScopeKey, type MessageScope } from '@/data/messages/types';

export function usePrivateMessageImage(scope: MessageScope, attachmentId: string | null) {
  const [attempt, retry] = useState(0);
  const key = `${messageScopeKey(scope)}:${attachmentId}:${attempt}`;
  const [result, setResult] = useState<{ key: string; url: string | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!attachmentId) return;
    const controller = new AbortController(); let url: string | null = null;
    void messageTransport.image(scope, attachmentId, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setResult({ key, url, error: null });
    }, () => { if (!controller.signal.aborted) setResult({ key, url: null, error: 'Image unavailable. Retry to load it securely.' }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [scope, attachmentId, key]);
  return { url: result?.key === key ? result.url : null, error: result?.key === key ? result.error : null, retry: () => retry(value => value + 1) };
}
