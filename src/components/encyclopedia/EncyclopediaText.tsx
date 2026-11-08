import React from 'react';
import HighlightedText from '@/components/task/HighlightedText';

export default function EncyclopediaText({ text, color, highlight }: {
  text: string; color: string | null | undefined; highlight: boolean; hasImage: boolean; surface: 'tile' | 'popup';
}) {
  return <HighlightedText text={text} highlight={highlight} color={color ?? '#FFFFFF'} />;
}
