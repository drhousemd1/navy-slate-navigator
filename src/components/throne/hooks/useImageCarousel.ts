import { useEffect, useMemo, useState } from 'react';

/** Each card owns and cleans its timer. Loaded/replaced images reset the cursor;
 * reduced motion stops automatic rotation, while Next remains keyboard usable. */
export function useImageCarousel({ images }: { images: (string | null)[] }) {
  const signature = JSON.stringify(images);
  const available = useMemo(() => (JSON.parse(signature) as (string | null)[]).filter((image): image is string => image !== null), [signature]);
  const [cursor, setCursor] = useState({ signature, index: 0 });
  const index = cursor.signature === signature ? cursor.index % Math.max(available.length, 1) : 0;
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const changed = () => setReducedMotion(media.matches); changed();
    media.addEventListener('change', changed); return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (paused || reducedMotion || available.length < 2) return;
    const timer = setInterval(() => setCursor(current => ({ signature, index: ((current.signature === signature ? current.index : 0) + 1) % available.length })), 6000);
    return () => clearInterval(timer);
  }, [available.length, paused, reducedMotion, signature]);
  const next = () => setCursor({ signature, index: (index + 1) % Math.max(available.length, 1) });
  return { visibleImage: available[index] ?? null, index, count: available.length, paused, reducedMotion, setPaused, next };
}
