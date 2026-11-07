import React from 'react';
import HighlightedText from '@/components/task/HighlightedText';
import { useColorScheme } from '@/contexts/ColorSchemeContext';
import { encyclopediaTextBacking } from '@/data/encyclopedia/contrast';

export default function EncyclopediaText({ text, color, highlight, hasImage, surface }: {
  text: string; color: string | null | undefined; highlight: boolean; hasImage: boolean; surface: 'tile' | 'popup';
}) {
  const { currentScheme } = useColorScheme();
  const backgroundColor = encyclopediaTextBacking({ color, highlight, hasImage, surface, schemeName: currentScheme });
  const content = <HighlightedText text={text} highlight={highlight} color={color ?? 'hsl(var(--foreground))'} />;
  return backgroundColor ? <span style={{ backgroundColor, padding: '1px 4px', borderRadius: '4px',
    boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{content}</span> : content;
}
