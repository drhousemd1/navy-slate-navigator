export type TextSurface = '--card' | '--dark-navy' | '--navy' | 'encyclopedia-tile';

/** Saved appearance is literal: the original UI adds a backing only for an explicit highlight. */
export function customTextBacking(_options: {
  color: string | null | undefined; schemeName: string; hasImage: boolean; highlight: boolean; surface: TextSurface;
}): string | undefined {
  return undefined;
}
