import { customTextBacking } from '@/lib/customTextContrast';

/** Preserve the library's existing tile-gradient and popup contrast treatment. */
export function encyclopediaTextBacking(options: {
  color: string | null | undefined; schemeName: string; hasImage: boolean; highlight: boolean; surface: 'tile' | 'popup';
}): string | undefined {
  return customTextBacking({ ...options, surface: options.surface === 'tile' ? 'encyclopedia-tile' : '--navy' });
}
